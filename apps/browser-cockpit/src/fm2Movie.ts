export type Fm2ButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";

export type Fm2ControllerButtons = Record<Fm2ButtonName, boolean>;

export type Fm2Frame = {
  index: number;
  command: string;
  p1: Fm2ControllerButtons;
  p2: Fm2ControllerButtons;
  raw: string;
};

export type Fm2Header = Record<string, string> & {
  version?: string;
  emuVersion?: string;
  rerecordCount?: string;
  palFlag?: string;
  romFilename?: string;
  romChecksum?: string;
};

export type Fm2Movie = {
  header: Fm2Header;
  comments: Record<string, string>;
  frames: Fm2Frame[];
};

export type Fm2MovieSummary = {
  inputFrames: number;
  playerFrames: {
    p1: number;
    p2: number;
  };
  hasTwoPlayerInput: boolean;
};

export type Fm2PlayerSide = "1P" | "2P";

export type Fm2BaselineWindow = {
  id: string;
  label: string;
  frameWindow: [number, number];
};

export type Fm2InputPatternSummary = {
  label: string;
  frames: number;
  ratio: number;
};

export type Fm2SideBaselineWindow = {
  movieId: string;
  sourceKind: "tas-side-split";
  side: Fm2PlayerSide;
  windowId: string;
  label: string;
  frameWindow: [number, number];
  rangeSemantics: "start-inclusive-end-exclusive";
  totalFrames: number;
  pressedFrames: number;
  pressedRatio: number;
  buttonPressFrames: Record<Fm2ButtonName, number>;
  topInputPatterns: Fm2InputPatternSummary[];
  intentHints: string[];
  acceptanceChecks: string[];
};

export type Fm2SideBaselineOptions = {
  movieId: string;
  windows: Fm2BaselineWindow[];
  maxPatterns?: number;
};

const FM2_BUTTON_ORDER: Fm2ButtonName[] = ["right", "left", "down", "up", "start", "select", "b", "a"];

const FM2_BUTTON_LABELS: Record<Fm2ButtonName, string> = {
  right: "→",
  left: "←",
  down: "↓",
  up: "↑",
  start: "START",
  select: "SELECT",
  b: "B",
  a: "A"
};

function createEmptyButtons(): Fm2ControllerButtons {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
    select: false
  };
}

function parseControllerField(field: string | undefined): Fm2ControllerButtons {
  const buttons = createEmptyButtons();
  const padded = (field ?? "").padEnd(FM2_BUTTON_ORDER.length, ".");
  for (let index = 0; index < FM2_BUTTON_ORDER.length; index += 1) {
    buttons[FM2_BUTTON_ORDER[index]] = padded[index] !== ".";
  }
  return buttons;
}

function hasPressedButton(buttons: Fm2ControllerButtons) {
  return FM2_BUTTON_ORDER.some((button) => buttons[button]);
}

function createButtonCounters(): Record<Fm2ButtonName, number> {
  return {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    a: 0,
    b: 0,
    start: 0,
    select: 0
  };
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function sideButtons(frame: Fm2Frame, side: Fm2PlayerSide) {
  return side === "1P" ? frame.p1 : frame.p2;
}

function deriveIntentHints(buttonPressFrames: Record<Fm2ButtonName, number>, totalFrames: number) {
  const hints: string[] = [];
  const rightRatio = ratio(buttonPressFrames.right, totalFrames);
  const leftRatio = ratio(buttonPressFrames.left, totalFrames);
  const jumpRatio = ratio(buttonPressFrames.a, totalFrames);
  const fireRatio = ratio(buttonPressFrames.b, totalFrames);
  const verticalAimRatio = ratio(buttonPressFrames.up + buttonPressFrames.down, totalFrames);
  const menuRatio = ratio(buttonPressFrames.start + buttonPressFrames.select, totalFrames);

  if (menuRatio > 0.02) hints.push("menu_sync");
  if (rightRatio >= 0.25) hints.push("advance");
  if (leftRatio >= 0.12) hints.push("retreat_or_spacing");
  if (jumpRatio >= 0.04) hints.push("jump");
  if (fireRatio >= 0.12) hints.push("fire_target");
  if (fireRatio >= 0.08 && verticalAimRatio >= 0.08) hints.push("aim_fire");
  if (hints.length <= 0) hints.push("idle_or_wait");

  return hints;
}

export function fm2ButtonsToLabels(buttons: Fm2ControllerButtons) {
  const active = FM2_BUTTON_ORDER
    .filter((button) => buttons[button])
    .map((button) => FM2_BUTTON_LABELS[button]);
  return active.length > 0 ? active.join("") : "-";
}

export function resolveFm2PlaybackStartFrame(movie: Fm2Movie, requestedFrame?: number) {
  if (movie.frames.length <= 0) return 0;
  const candidate = Math.trunc(Number.isFinite(requestedFrame) ? requestedFrame ?? 0 : 0);
  return Math.min(Math.max(candidate, 0), movie.frames.length - 1);
}

export function parseFm2Movie(source: string): Fm2Movie {
  const header: Fm2Header = {};
  const comments: Record<string, string> = {};
  const frames: Fm2Frame[] = [];
  const lines = source.split(/\r?\n/);
  let inputStarted = false;

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("|")) {
      inputStarted = true;
      const parts = line.split("|");
      frames.push({
        index: frames.length,
        command: parts[1] ?? "",
        p1: parseControllerField(parts[2]),
        p2: parseControllerField(parts[3]),
        raw: line
      });
      continue;
    }

    if (inputStarted) continue;
    const separatorIndex = line.indexOf(" ");
    const key = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
    const value = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "";
    if (key === "comment") {
      const commentSeparator = value.indexOf(" ");
      const commentKey = commentSeparator >= 0 ? value.slice(0, commentSeparator) : `comment${Object.keys(comments).length + 1}`;
      const commentValue = commentSeparator >= 0 ? value.slice(commentSeparator + 1) : value;
      comments[commentKey] = commentValue;
      continue;
    }
    header[key] = value;
  }

  if (header.binary === "1") {
    throw new Error("Binary FM2 movies are not supported by the browser cockpit parser.");
  }

  return { header, comments, frames };
}

export function summarizeFm2Movie(movie: Fm2Movie): Fm2MovieSummary {
  let p1 = 0;
  let p2 = 0;
  for (const frame of movie.frames) {
    if (hasPressedButton(frame.p1)) p1 += 1;
    if (hasPressedButton(frame.p2)) p2 += 1;
  }
  return {
    inputFrames: movie.frames.length,
    playerFrames: { p1, p2 },
    hasTwoPlayerInput: p2 > 0
  };
}

export function extractFm2SideBaselineWindows(movie: Fm2Movie, options: Fm2SideBaselineOptions): Fm2SideBaselineWindow[] {
  const maxPatterns = Math.max(1, Math.trunc(options.maxPatterns ?? 5));
  const sides: Fm2PlayerSide[] = ["1P", "2P"];
  const baselines: Fm2SideBaselineWindow[] = [];

  for (const window of options.windows) {
    const start = resolveFm2PlaybackStartFrame(movie, window.frameWindow[0]);
    const endCandidate = Math.trunc(Number.isFinite(window.frameWindow[1]) ? window.frameWindow[1] : start);
    const end = Math.min(Math.max(endCandidate, start + 1), movie.frames.length);
    const frames = movie.frames.slice(start, end);

    for (const side of sides) {
      const buttonPressFrames = createButtonCounters();
      const patternCounts = new Map<string, number>();
      let pressedFrames = 0;

      for (const frame of frames) {
        const buttons = sideButtons(frame, side);
        if (hasPressedButton(buttons)) pressedFrames += 1;
        for (const button of FM2_BUTTON_ORDER) {
          if (buttons[button]) buttonPressFrames[button] += 1;
        }
        const label = fm2ButtonsToLabels(buttons);
        if (label !== "-") patternCounts.set(label, (patternCounts.get(label) ?? 0) + 1);
      }

      const totalFrames = frames.length;
      const topInputPatterns = Array.from(patternCounts.entries())
        .map(([label, count]) => ({ label, frames: count, ratio: ratio(count, totalFrames) }))
        .sort((left, right) => right.frames - left.frames || left.label.localeCompare(right.label))
        .slice(0, maxPatterns);

      baselines.push({
        movieId: options.movieId,
        sourceKind: "tas-side-split",
        side,
        windowId: window.id,
        label: window.label,
        frameWindow: [start, end],
        rangeSemantics: "start-inclusive-end-exclusive",
        totalFrames,
        pressedFrames,
        pressedRatio: ratio(pressedFrames, totalFrames),
        buttonPressFrames,
        topInputPatterns,
        intentHints: deriveIntentHints(buttonPressFrames, totalFrames),
        acceptanceChecks: [
          "hash-exact-match-required",
          "real-runtime-trace-required",
          "safety-override-required",
          "side-owned-promotion-required"
        ]
      });
    }
  }

  return baselines;
}
