import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { NES, Controller, type ButtonKey } from "jsnes";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  Gamepad2,
  Gauge,
  HeartPulse,
  Keyboard,
  Map as MapIcon,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  Target,
  Upload,
  UserRound,
  Zap
} from "lucide-react";
import "./styles.css";

type PlayerSide = "1P" | "2P";
type ButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
type ButtonState = Record<ButtonName, boolean>;
type PlayerButtonStates = Record<PlayerSide, ButtonState>;
type RuntimeStatus = "no-rom" | "loading" | "loaded" | "running" | "paused" | "error";
type AudioStatus = "off" | "starting" | "on" | "blocked" | "unsupported" | "error";
type ControlMode = "human" | "ai" | "hybrid";
type InputSource = "keyboard" | "gamepad" | "panel" | "ai" | "system";

type Pilot = {
  side: PlayerSide;
  name: string;
  status: string;
  mode: ControlMode;
  strategy: string;
  temperament: string;
  buttons: ButtonState;
  accent: "blue" | "red";
  keyboardHint: string;
  gamepadHint: string;
  lastInput: string;
};

type AudioRuntime = {
  context: AudioContext;
  pushSample: (left: number, right: number) => void;
  close: () => void;
};

const playerSides: PlayerSide[] = ["1P", "2P"];
const buttonNames: ButtonName[] = ["up", "down", "left", "right", "select", "start", "b", "a"];
const inputSources: InputSource[] = ["keyboard", "gamepad", "panel", "ai", "system"];
const humanSources: InputSource[] = ["keyboard", "gamepad", "panel"];

const playerNumbers: Record<PlayerSide, 1 | 2> = {
  "1P": 1,
  "2P": 2
};

const buttonMap: Record<ButtonName, ButtonKey> = {
  a: Controller.BUTTON_A,
  b: Controller.BUTTON_B,
  select: Controller.BUTTON_SELECT,
  start: Controller.BUTTON_START,
  up: Controller.BUTTON_UP,
  down: Controller.BUTTON_DOWN,
  left: Controller.BUTTON_LEFT,
  right: Controller.BUTTON_RIGHT
};

const keyboardMap = new Map<string, { side: PlayerSide; button: ButtonName }>([
  ["ArrowUp", { side: "1P", button: "up" }],
  ["ArrowDown", { side: "1P", button: "down" }],
  ["ArrowLeft", { side: "1P", button: "left" }],
  ["ArrowRight", { side: "1P", button: "right" }],
  ["KeyZ", { side: "1P", button: "b" }],
  ["KeyX", { side: "1P", button: "a" }],
  ["Enter", { side: "1P", button: "start" }],
  ["ShiftLeft", { side: "1P", button: "select" }],
  ["ShiftRight", { side: "1P", button: "select" }],
  ["KeyW", { side: "2P", button: "up" }],
  ["KeyS", { side: "2P", button: "down" }],
  ["KeyA", { side: "2P", button: "left" }],
  ["KeyD", { side: "2P", button: "right" }],
  ["KeyJ", { side: "2P", button: "b" }],
  ["KeyK", { side: "2P", button: "a" }],
  ["KeyI", { side: "2P", button: "start" }],
  ["KeyU", { side: "2P", button: "select" }]
]);

const controlModeLabels: Record<ControlMode, string> = {
  human: "人类",
  ai: "AI",
  hybrid: "混合"
};

const modeStrategyLabels: Record<ControlMode, string> = {
  human: "只写入人类输入",
  ai: "AI 占位，空输入安全等待",
  hybrid: "人类优先，AI 后续补助"
};

const modeLastInputLabels: Record<ControlMode, string> = {
  human: "等待人类输入",
  ai: "AI 占位，等待 FSM",
  hybrid: "混合模式，人类优先"
};

const keyboardHints: Record<PlayerSide, string> = {
  "1P": "方向键 / Z=B / X=A / Enter=开始 / Shift=选择",
  "2P": "WASD / J=B / K=A / I=开始 / U=选择"
};

const tacticalStack = [
  { label: "生存", value: "等待 RAM", icon: Shield },
  { label: "路线", value: "等待 WorldX", icon: MapIcon },
  { label: "协作", value: "排队中", icon: HeartPulse },
  { label: "战斗", value: "仅输入测试", icon: Target },
  { label: "推进", value: "受控", icon: Activity }
];

const AUDIO_SAMPLE_RATE = 44100;
const AUDIO_BUFFER_SIZE = 2048;
const AUDIO_BUFFER_CAPACITY = AUDIO_SAMPLE_RATE * 2;
const GAMEPAD_AXIS_THRESHOLD = 0.5;

function createButtonState(): ButtonState {
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

function createPlayerButtonStates(): PlayerButtonStates {
  return {
    "1P": createButtonState(),
    "2P": createButtonState()
  };
}

function createSourceInputStates(): Record<PlayerSide, Record<InputSource, ButtonState>> {
  return {
    "1P": {
      keyboard: createButtonState(),
      gamepad: createButtonState(),
      panel: createButtonState(),
      ai: createButtonState(),
      system: createButtonState()
    },
    "2P": {
      keyboard: createButtonState(),
      gamepad: createButtonState(),
      panel: createButtonState(),
      ai: createButtonState(),
      system: createButtonState()
    }
  };
}

function createAudioRuntime(): AudioRuntime {
  const maybeWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext ?? maybeWindow.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error("当前浏览器不支持 Web Audio。");
  }

  const context = new AudioContextConstructor({ sampleRate: AUDIO_SAMPLE_RATE });
  const processor = context.createScriptProcessor(AUDIO_BUFFER_SIZE, 0, 2);
  const gain = context.createGain();
  const leftBuffer = new Float32Array(AUDIO_BUFFER_CAPACITY);
  const rightBuffer = new Float32Array(AUDIO_BUFFER_CAPACITY);
  let readIndex = 0;
  let writeIndex = 0;
  let buffered = 0;

  gain.gain.value = 0.28;

  processor.onaudioprocess = (event) => {
    const outputLeft = event.outputBuffer.getChannelData(0);
    const outputRight = event.outputBuffer.getChannelData(1);
    for (let i = 0; i < outputLeft.length; i += 1) {
      if (buffered > 0) {
        outputLeft[i] = leftBuffer[readIndex];
        outputRight[i] = rightBuffer[readIndex];
        readIndex = (readIndex + 1) % AUDIO_BUFFER_CAPACITY;
        buffered -= 1;
      } else {
        outputLeft[i] = 0;
        outputRight[i] = 0;
      }
    }
  };

  processor.connect(gain);
  gain.connect(context.destination);

  return {
    context,
    pushSample: (left, right) => {
      if (buffered >= AUDIO_BUFFER_CAPACITY) {
        readIndex = (readIndex + 1) % AUDIO_BUFFER_CAPACITY;
        buffered -= 1;
      }
      leftBuffer[writeIndex] = left;
      rightBuffer[writeIndex] = right;
      writeIndex = (writeIndex + 1) % AUDIO_BUFFER_CAPACITY;
      buffered += 1;
    },
    close: () => {
      processor.disconnect();
      gain.disconnect();
      void context.close();
    }
  };
}

async function tryResumeAudioContext(context: AudioContext) {
  await Promise.race([
    context.resume().catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 1200))
  ]);
  return context.state === "running";
}

function statusLabel(status: RuntimeStatus) {
  if (status === "no-rom") return "未加载 ROM";
  if (status === "loading") return "正在加载 ROM";
  if (status === "loaded") return "ROM 已加载";
  if (status === "running") return "运行中";
  if (status === "paused") return "已暂停";
  return "运行错误";
}

function audioLabel(status: AudioStatus) {
  if (status === "starting") return "声音启动中";
  if (status === "on") return "声音已开启";
  if (status === "blocked") return "请点击启用声音";
  if (status === "unsupported") return "浏览器不支持声音";
  if (status === "error") return "声音错误";
  return "启用声音";
}

function hasPressedButton(buttons: ButtonState) {
  return buttonNames.some((button) => buttons[button]);
}

function mapGamepadButtons(gamepad: Gamepad | null | undefined): ButtonState {
  const next = createButtonState();
  if (!gamepad) return next;

  const buttonPressed = (index: number) => Boolean(gamepad.buttons[index]?.pressed);
  const axis = (index: number) => gamepad.axes[index] ?? 0;

  next.up = buttonPressed(12) || axis(1) < -GAMEPAD_AXIS_THRESHOLD;
  next.down = buttonPressed(13) || axis(1) > GAMEPAD_AXIS_THRESHOLD;
  next.left = buttonPressed(14) || axis(0) < -GAMEPAD_AXIS_THRESHOLD;
  next.right = buttonPressed(15) || axis(0) > GAMEPAD_AXIS_THRESHOLD;
  next.a = buttonPressed(0);
  next.b = buttonPressed(2) || buttonPressed(1);
  next.select = buttonPressed(8);
  next.start = buttonPressed(9);
  return next;
}

function gamepadLabel(gamepad: Gamepad | null | undefined, fallbackIndex: number) {
  if (!gamepad) return `Gamepad ${fallbackIndex} 未连接`;
  const name = gamepad.id.length > 28 ? `${gamepad.id.slice(0, 28)}...` : gamepad.id;
  return `Gamepad ${fallbackIndex} 已连接：${name}`;
}

function PadButton({
  label,
  active,
  onDown,
  onUp
}: {
  label: string;
  active: boolean;
  onDown?: () => void;
  onUp?: () => void;
}) {
  return (
    <button
      className={active ? "pad-button active" : "pad-button"}
      onPointerDown={(event) => {
        event.preventDefault();
        onDown?.();
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        onUp?.();
      }}
      onPointerCancel={() => onUp?.()}
      onPointerLeave={() => onUp?.()}
      type="button"
    >
      {label}
    </button>
  );
}

function ControllerView({
  buttons,
  onButtonDown,
  onButtonUp
}: {
  buttons: ButtonState;
  onButtonDown?: (button: ButtonName) => void;
  onButtonUp?: (button: ButtonName) => void;
}) {
  return (
    <div className="controller" aria-label="实时手柄">
      <div className="dpad">
        <PadButton label="上" active={buttons.up} onDown={() => onButtonDown?.("up")} onUp={() => onButtonUp?.("up")} />
        <div className="dpad-mid">
          <PadButton label="左" active={buttons.left} onDown={() => onButtonDown?.("left")} onUp={() => onButtonUp?.("left")} />
          <PadButton label="右" active={buttons.right} onDown={() => onButtonDown?.("right")} onUp={() => onButtonUp?.("right")} />
        </div>
        <PadButton label="下" active={buttons.down} onDown={() => onButtonDown?.("down")} onUp={() => onButtonUp?.("down")} />
      </div>
      <div className="system-buttons">
        <PadButton label="选择" active={buttons.select} onDown={() => onButtonDown?.("select")} onUp={() => onButtonUp?.("select")} />
        <PadButton label="开始" active={buttons.start} onDown={() => onButtonDown?.("start")} onUp={() => onButtonUp?.("start")} />
      </div>
      <div className="action-buttons">
        <PadButton label="B" active={buttons.b} onDown={() => onButtonDown?.("b")} onUp={() => onButtonUp?.("b")} />
        <PadButton label="A" active={buttons.a} onDown={() => onButtonDown?.("a")} onUp={() => onButtonUp?.("a")} />
      </div>
    </div>
  );
}

function PilotPanel({
  pilot,
  onButtonDown,
  onButtonUp,
  onModeChange
}: {
  pilot: Pilot;
  onButtonDown?: (button: ButtonName) => void;
  onButtonUp?: (button: ButtonName) => void;
  onModeChange: (mode: ControlMode) => void;
}) {
  const Icon = pilot.mode === "ai" ? Bot : UserRound;
  return (
    <section className={`pilot-panel ${pilot.accent}`}>
      <div className="panel-title">
        <Icon size={18} />
        <span>{pilot.side} 控制舱</span>
      </div>
      <div className="pilot-card">
        <div className="avatar">
          <Icon size={34} />
        </div>
        <div>
          <div className="pilot-name">{pilot.name}</div>
          <div className="pilot-role">{controlModeLabels[pilot.mode]} / {pilot.status}</div>
        </div>
      </div>
      <div className="mode-selector" role="group" aria-label={`${pilot.side} 控制模式`}>
        {(["human", "ai", "hybrid"] as ControlMode[]).map((mode) => (
          <button
            className={pilot.mode === mode ? "mode-button active" : "mode-button"}
            key={mode}
            onClick={() => onModeChange(mode)}
            type="button"
          >
            {controlModeLabels[mode]}
          </button>
        ))}
      </div>
      <dl className="compact-grid">
        <div>
          <dt>模式</dt>
          <dd>{controlModeLabels[pilot.mode]}</dd>
        </div>
        <div>
          <dt>策略</dt>
          <dd>{pilot.strategy}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{pilot.temperament}</dd>
        </div>
      </dl>
      <ControllerView buttons={pilot.buttons} onButtonDown={onButtonDown} onButtonUp={onButtonUp} />
      <div className="input-meta">
        <div>
          <Keyboard size={15} />
          <span>{pilot.keyboardHint}</span>
        </div>
        <div>
          <Gamepad2 size={15} />
          <span>{pilot.gamepadHint}</span>
        </div>
        <div>
          <Radio size={15} />
          <span>{pilot.lastInput}</span>
        </div>
      </div>
      <button className="switch-button" type="button">
        <Gamepad2 size={16} />
        <span>最终写入 {pilot.side}</span>
      </button>
    </section>
  );
}

function GameViewport({
  canvasRef,
  status,
  audioStatus,
  message,
  frameCount,
  onEnableAudio,
  onLoadLocalRom,
  onRun,
  onPause,
  onReset,
  onStartPulse,
  onInputSmoke
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: RuntimeStatus;
  audioStatus: AudioStatus;
  message: string;
  frameCount: number;
  onEnableAudio: () => void;
  onLoadLocalRom: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onStartPulse: (side: PlayerSide) => void;
  onInputSmoke: (side: PlayerSide) => void;
}) {
  const canRun = status === "loaded" || status === "paused";
  const isRunning = status === "running";
  const hasRom = status === "loaded" || status === "running" || status === "paused";

  return (
    <section className="game-stage" aria-label="游戏画面">
      <div className="runtime-row">
        <span>{statusLabel(status)}</span>
        <span>帧数：{frameCount}</span>
      </div>
      <div className="crt">
        <canvas ref={canvasRef} className="nes-canvas" width={256} height={240} />
        {!hasRom && (
          <div className="rom-overlay">
            <AlertTriangle size={22} />
            <strong>{message}</strong>
          </div>
        )}
      </div>
      <div className="stage-toolbar">
        <button onClick={onLoadLocalRom} type="button"><Upload size={15} /> 加载本地 ROM</button>
        {isRunning
          ? <button onClick={onPause} type="button"><Pause size={15} /> 暂停</button>
          : <button disabled={!canRun} onClick={onRun} type="button"><Play size={15} /> 运行</button>}
        <button disabled={audioStatus === "starting" || audioStatus === "on"} onClick={onEnableAudio} type="button"><Radio size={15} /> {audioLabel(audioStatus)}</button>
        <button disabled={!hasRom} onClick={() => onStartPulse("1P")} type="button"><Gamepad2 size={15} /> 1P 开始</button>
        <button disabled={!hasRom} onClick={() => onStartPulse("2P")} type="button"><Gamepad2 size={15} /> 2P 开始</button>
        <button disabled={!hasRom} onClick={() => onInputSmoke("1P")} type="button"><Zap size={15} /> 1P 输入测试</button>
        <button disabled={!hasRom} onClick={() => onInputSmoke("2P")} type="button"><Zap size={15} /> 2P 输入测试</button>
        <button disabled={!hasRom} onClick={onReset} type="button"><RotateCcw size={15} /> 重置</button>
      </div>
    </section>
  );
}

function TacticalPanel() {
  return (
    <section className="tactical-panel">
      <div className="panel-title">
        <Brain size={18} />
        <span>快脑</span>
      </div>
      <div className="state-strip">
        <div>
          <dt>CameraX</dt>
          <dd>等待</dd>
        </div>
        <div>
          <dt>PlayerX</dt>
          <dd>等待</dd>
        </div>
        <div>
          <dt>WorldX</dt>
          <dd>等待</dd>
        </div>
      </div>
      <div className="stack-list">
        {tacticalStack.map((item) => {
          const Icon = item.icon;
          return (
            <div className="stack-row" key={item.label}>
              <Icon size={17} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LogPanel({ eventLog }: { eventLog: string[] }) {
  return (
    <section className="log-panel">
      <div className="panel-title">
        <Radio size={18} />
        <span>事件流</span>
      </div>
      <div className="log-lines">
        {eventLog.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nesRef = useRef<NES | null>(null);
  const audioRef = useRef<AudioRuntime | null>(null);
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const frameRef = useRef(0);
  const autoLoadStartedRef = useRef(false);
  const autoSmokeStartedRef = useRef(false);
  const finalButtonsRef = useRef<PlayerButtonStates>(createPlayerButtonStates());
  const sourceButtonsRef = useRef(createSourceInputStates());
  const controlModesRef = useRef<Record<PlayerSide, ControlMode>>({ "1P": "human", "2P": "human" });
  const gamepadLabelsRef = useRef<Record<PlayerSide, string>>({
    "1P": gamepadLabel(null, 0),
    "2P": gamepadLabel(null, 1)
  });
  const [status, setStatus] = useState<RuntimeStatus>("no-rom");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("off");
  const [message, setMessage] = useState("加载本地用户自有 ROM 后开始真实模拟器测试。");
  const [frameCount, setFrameCount] = useState(0);
  const [buttonStates, setButtonStates] = useState<PlayerButtonStates>(createPlayerButtonStates);
  const [controlModes, setControlModes] = useState<Record<PlayerSide, ControlMode>>({ "1P": "human", "2P": "human" });
  const [gamepadLabelsState, setGamepadLabelsState] = useState<Record<PlayerSide, string>>(gamepadLabelsRef.current);
  const [lastInputs, setLastInputs] = useState<Record<PlayerSide, string>>({
    "1P": "等待输入",
    "2P": "等待输入"
  });
  const [eventLog, setEventLog] = useState<string[]>([
    "PM：2P 输入路由准备中",
    "运行时：等待本地用户自有 ROM",
    "边界：仓库不提交、不打包 ROM",
    "BOT：AI 模式当前为安全占位"
  ]);

  const appendLog = useCallback((line: string) => {
    setEventLog((current) => [line, ...current].slice(0, 10));
  }, []);

  const isSourceAllowed = useCallback((side: PlayerSide, source: InputSource) => {
    const mode = controlModesRef.current[side];
    if (source === "system") return true;
    if (humanSources.includes(source)) return mode === "human" || mode === "hybrid";
    if (source === "ai") return mode === "ai" || mode === "hybrid";
    return false;
  }, []);

  const recomputeSide = useCallback((side: PlayerSide) => {
    const next = createButtonState();
    for (const source of inputSources) {
      if (!isSourceAllowed(side, source)) continue;
      const sourceButtons = sourceButtonsRef.current[side][source];
      for (const button of buttonNames) {
        next[button] = next[button] || sourceButtons[button];
      }
    }

    const previous = finalButtonsRef.current[side];
    const nes = nesRef.current;
    for (const button of buttonNames) {
      if (previous[button] === next[button]) continue;
      if (nes) {
        if (next[button]) nes.buttonDown(playerNumbers[side], buttonMap[button]);
        else nes.buttonUp(playerNumbers[side], buttonMap[button]);
      }
    }

    finalButtonsRef.current = {
      ...finalButtonsRef.current,
      [side]: next
    };
    setButtonStates((current) => ({
      ...current,
      [side]: next
    }));
  }, [isSourceAllowed]);

  const setSourceButtons = useCallback((side: PlayerSide, source: InputSource, next: ButtonState) => {
    sourceButtonsRef.current[side][source] = next;
    recomputeSide(side);
    if (source !== "system" && hasPressedButton(next)) {
      const sourceLabel = source === "keyboard" ? "键盘" : source === "gamepad" ? "游戏手柄" : source === "panel" ? "屏幕按钮" : "AI";
      setLastInputs((current) => ({
        ...current,
        [side]: `${sourceLabel} 输入`
      }));
    }
  }, [recomputeSide]);

  const setSourceButton = useCallback((side: PlayerSide, source: InputSource, button: ButtonName, pressed: boolean) => {
    const allowed = isSourceAllowed(side, source);
    const current = sourceButtonsRef.current[side][source];
    const next = {
      ...current,
      [button]: pressed && allowed
    };
    setSourceButtons(side, source, next);
  }, [isSourceAllowed, setSourceButtons]);

  const clearSourcesForSide = useCallback((side: PlayerSide, sourcesToClear: InputSource[]) => {
    for (const source of sourcesToClear) {
      sourceButtonsRef.current[side][source] = createButtonState();
    }
    recomputeSide(side);
  }, [recomputeSide]);

  const clearAllInputs = useCallback(() => {
    const nes = nesRef.current;
    for (const side of playerSides) {
      for (const button of buttonNames) {
        if (nes && finalButtonsRef.current[side][button]) {
          nes.buttonUp(playerNumbers[side], buttonMap[button]);
        }
      }
    }
    sourceButtonsRef.current = createSourceInputStates();
    finalButtonsRef.current = createPlayerButtonStates();
    setButtonStates(createPlayerButtonStates());
    setLastInputs({ "1P": "等待输入", "2P": "等待输入" });
  }, []);

  const changeControlMode = useCallback((side: PlayerSide, mode: ControlMode) => {
    controlModesRef.current = {
      ...controlModesRef.current,
      [side]: mode
    };
    setControlModes((current) => ({
      ...current,
      [side]: mode
    }));

    if (mode === "human") clearSourcesForSide(side, ["ai"]);
    if (mode === "ai") clearSourcesForSide(side, ["keyboard", "gamepad", "panel"]);
    if (mode === "hybrid") recomputeSide(side);

    setLastInputs((current) => ({
      ...current,
      [side]: modeLastInputLabels[mode]
    }));
    appendLog(`${side} 模式切换：${controlModeLabels[mode]}`);
  }, [appendLog, clearSourcesForSide, recomputeSide]);

  const renderFrame = useCallback((buffer: Uint32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = context.getImageData(0, 0, 256, 240);
    for (let i = 0; i < buffer.length; i += 1) {
      const color = buffer[i];
      const offset = i * 4;
      image.data[offset] = color & 0xff;
      image.data[offset + 1] = (color >> 8) & 0xff;
      image.data[offset + 2] = (color >> 16) & 0xff;
      image.data[offset + 3] = 0xff;
    }
    context.putImageData(image, 0, 0);
  }, []);

  const createNes = useCallback(() => {
    const nes = new NES({
      onFrame: renderFrame,
      onAudioSample: (left, right) => audioRef.current?.pushSample(left, right),
      emulateSound: true,
      sampleRate: AUDIO_SAMPLE_RATE
    });
    nesRef.current = nes;
    return nes;
  }, [renderFrame]);

  const enableAudio = useCallback(async () => {
    if (audioRef.current) {
      const resumed = await tryResumeAudioContext(audioRef.current.context);
      if (resumed) {
        setAudioStatus("on");
        appendLog("声音：已开启");
      } else {
        setAudioStatus("blocked");
        appendLog("声音：浏览器等待真实点击");
      }
      return;
    }
    setAudioStatus("starting");
    try {
      const runtime = createAudioRuntime();
      audioRef.current = runtime;
      const resumed = await tryResumeAudioContext(runtime.context);
      if (resumed) {
        setAudioStatus("on");
        appendLog("声音：已开启");
      } else {
        setAudioStatus("blocked");
        appendLog("声音：浏览器等待真实点击");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const unsupported = detail.includes("不支持");
      setAudioStatus(unsupported ? "unsupported" : "error");
      appendLog(`声音错误：${detail}`);
    }
  }, [appendLog]);

  const pulseButton = useCallback((side: PlayerSide, button: ButtonName, ms = 180) => {
    setSourceButton(side, "system", button, true);
    window.setTimeout(() => setSourceButton(side, "system", button, false), ms);
  }, [setSourceButton]);

  const applyGamepads = useCallback(() => {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const nextLabels: Record<PlayerSide, string> = {
      "1P": gamepadLabel(pads[0], 0),
      "2P": gamepadLabel(pads[1], 1)
    };

    for (const side of playerSides) {
      const index = side === "1P" ? 0 : 1;
      const nextButtons = mapGamepadButtons(pads[index]);
      setSourceButtons(side, "gamepad", nextButtons);
    }

    if (frameRef.current % 30 === 0 && (
      nextLabels["1P"] !== gamepadLabelsRef.current["1P"] ||
      nextLabels["2P"] !== gamepadLabelsRef.current["2P"]
    )) {
      gamepadLabelsRef.current = nextLabels;
      setGamepadLabelsState(nextLabels);
    }
  }, [setSourceButtons]);

  const tickFrame = useCallback(() => {
    if (!runningRef.current) return;
    const nes = nesRef.current;
    if (nes) {
      applyGamepads();
      nes.frame();
      frameRef.current += 1;
      if (frameRef.current % 10 === 0) setFrameCount(frameRef.current);
    }
  }, [applyGamepads]);

  const setRunning = useCallback((running: boolean) => {
    runningRef.current = running;
    if (running) {
      setStatus("running");
      if (timerRef.current === null) {
        tickFrame();
        timerRef.current = window.setInterval(tickFrame, 1000 / 60);
      }
    } else {
      setStatus((current) => current === "running" ? "paused" : current);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [tickFrame]);

  const loadLocalRom = useCallback(async () => {
    setStatus("loading");
    setMessage("正在通过本地开发端点加载 ROM...");
    try {
      const response = await fetch("/api/local-test-rom", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `ROM endpoint returned ${response.status}`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      const nes = nesRef.current || createNes();
      nes.loadROM(data);
      frameRef.current = 0;
      setFrameCount(0);
      clearAllInputs();
      setStatus("loaded");
      setMessage(`本地 ROM 已加载：${data.byteLength} 字节。`);
      appendLog(`运行时：本地 ROM 已加载（${data.byteLength} 字节）`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setStatus("error");
      setMessage(detail);
      appendLog(`运行错误：${detail}`);
    }
  }, [appendLog, clearAllInputs, createNes]);

  const resetRuntime = useCallback(() => {
    const nes = nesRef.current;
    if (!nes) return;
    setRunning(false);
    clearAllInputs();
    nes.reset();
    frameRef.current = 0;
    setFrameCount(0);
    setStatus("loaded");
    appendLog("运行时：模拟器已重置");
  }, [appendLog, clearAllInputs, setRunning]);

  const runInputSmoke = useCallback((side: PlayerSide) => {
    if (!nesRef.current) return;
    setRunning(true);
    appendLog(`${side} 输入测试：延迟按开始键，然后按住右 + B`);
    window.setTimeout(() => pulseButton(side, "start", 260), 1200);
    window.setTimeout(() => pulseButton(side, "start", 260), 2600);
    window.setTimeout(() => {
      setSourceButton(side, "system", "right", true);
      setSourceButton(side, "system", "b", true);
    }, 3600);
    window.setTimeout(() => {
      setSourceButton(side, "system", "right", false);
      setSourceButton(side, "system", "b", false);
    }, 6200);
  }, [appendLog, pulseButton, setRunning, setSourceButton]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mapped = keyboardMap.get(event.code);
      if (!mapped) return;
      event.preventDefault();
      setSourceButton(mapped.side, "keyboard", mapped.button, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const mapped = keyboardMap.get(event.code);
      if (!mapped) return;
      event.preventDefault();
      setSourceButton(mapped.side, "keyboard", mapped.button, false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setSourceButton]);

  useEffect(() => {
    const onGamepadConnected = (event: GamepadEvent) => {
      appendLog(`游戏手柄连接：${event.gamepad.index}`);
    };
    const onGamepadDisconnected = (event: GamepadEvent) => {
      appendLog(`游戏手柄断开：${event.gamepad.index}`);
    };
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    return () => {
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
    };
  }, [appendLog]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoload") === "1" && !autoLoadStartedRef.current) {
      autoLoadStartedRef.current = true;
      void loadLocalRom();
    }
  }, [loadLocalRom]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasRom = status === "loaded" || status === "paused" || status === "running";
    if (!hasRom || autoSmokeStartedRef.current) return;
    if (params.get("autorun") === "1") setRunning(true);
    if (params.get("smoke") === "1") {
      autoSmokeStartedRef.current = true;
      runInputSmoke("1P");
    }
  }, [runInputSmoke, setRunning, status]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      audioRef.current?.close();
    };
  }, []);

  const pilots: Pilot[] = [
    {
      side: "1P",
      name: "玩家 1",
      status: status === "running"
        ? controlModes["1P"] === "ai" ? "AI 占位" : controlModes["1P"] === "hybrid" ? "人机混合" : "可操作"
        : statusLabel(status),
      mode: controlModes["1P"],
      strategy: modeStrategyLabels[controlModes["1P"]],
      temperament: controlModes["1P"] === "ai" ? "人类输入被隔离" : "人类输入可写入",
      buttons: buttonStates["1P"],
      accent: "blue",
      keyboardHint: keyboardHints["1P"],
      gamepadHint: gamepadLabelsState["1P"],
      lastInput: lastInputs["1P"]
    },
    {
      side: "2P",
      name: "玩家 2 / AI 伙伴",
      status: status === "running"
        ? controlModes["2P"] === "ai" ? "AI 占位" : controlModes["2P"] === "hybrid" ? "人机混合" : "可操作"
        : statusLabel(status),
      mode: controlModes["2P"],
      strategy: modeStrategyLabels[controlModes["2P"]],
      temperament: controlModes["2P"] === "ai" ? "AI 安全占位" : "人类输入可写入",
      buttons: buttonStates["2P"],
      accent: "red",
      keyboardHint: keyboardHints["2P"],
      gamepadHint: gamepadLabelsState["2P"],
      lastInput: lastInputs["2P"]
    }
  ];

  return (
    <main className="cockpit">
      <header className="topbar">
        <div>
          <h1>FC AI 陪玩驾驶舱</h1>
          <p>浏览器产品平台 / 双手柄输入路由</p>
        </div>
        <div className="status-cluster">
          <span><Gauge size={16} /> 目标 60 FPS</span>
          <span><AlertTriangle size={16} /> {statusLabel(status)}</span>
          <span><Radio size={16} /> {audioLabel(audioStatus)}</span>
        </div>
      </header>
      <div className="layout">
        <PilotPanel
          onButtonDown={(button) => setSourceButton("1P", "panel", button, true)}
          onButtonUp={(button) => setSourceButton("1P", "panel", button, false)}
          onModeChange={(mode) => changeControlMode("1P", mode)}
          pilot={pilots[0]}
        />
        <div className="center-column">
          <GameViewport
            audioStatus={audioStatus}
            canvasRef={canvasRef}
            frameCount={frameCount}
            message={message}
            onEnableAudio={enableAudio}
            onInputSmoke={runInputSmoke}
            onLoadLocalRom={loadLocalRom}
            onPause={() => setRunning(false)}
            onReset={resetRuntime}
            onRun={() => setRunning(true)}
            onStartPulse={(side) => pulseButton(side, "start", 220)}
            status={status}
          />
          <TacticalPanel />
          <LogPanel eventLog={eventLog} />
        </div>
        <PilotPanel
          onButtonDown={(button) => setSourceButton("2P", "panel", button, true)}
          onButtonUp={(button) => setSourceButton("2P", "panel", button, false)}
          onModeChange={(mode) => changeControlMode("2P", mode)}
          pilot={pilots[1]}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
