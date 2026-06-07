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

const FM2_BUTTON_ORDER: Fm2ButtonName[] = ["right", "left", "down", "up", "start", "select", "b", "a"];

const FM2_BUTTON_LABELS: Record<Fm2ButtonName, string> = {
  right: "右",
  left: "左",
  down: "下",
  up: "上",
  start: "开始",
  select: "选择",
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
