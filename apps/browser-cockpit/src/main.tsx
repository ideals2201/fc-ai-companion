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

type ButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";

type ButtonState = Record<ButtonName, boolean>;

type RuntimeStatus = "no-rom" | "loading" | "loaded" | "running" | "paused" | "error";

type AudioStatus = "off" | "starting" | "on" | "blocked" | "unsupported" | "error";

type Pilot = {
  side: "1P" | "2P";
  name: string;
  role: "Human" | "AI";
  status: string;
  mode: string;
  strategy: string;
  temperament: string;
  buttons: ButtonState;
  accent: "blue" | "red";
};

const blankButtons: ButtonState = {
  up: false,
  down: false,
  left: false,
  right: false,
  a: false,
  b: false,
  start: false,
  select: false
};

const AUDIO_SAMPLE_RATE = 44100;
const AUDIO_BUFFER_SIZE = 2048;
const AUDIO_BUFFER_CAPACITY = AUDIO_SAMPLE_RATE * 2;

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

const keyMap = new Map<string, ButtonName>([
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
  ["z", "b"],
  ["Z", "b"],
  ["x", "a"],
  ["X", "a"],
  ["Enter", "start"],
  ["Shift", "select"]
]);

const tacticalStack = [
  { label: "生存", value: "等待 RAM", icon: Shield },
  { label: "路线", value: "等待 WorldX", icon: MapIcon },
  { label: "协作", value: "排队中", icon: HeartPulse },
  { label: "战斗", value: "仅输入测试", icon: Target },
  { label: "推进", value: "受控", icon: Activity }
];

type AudioRuntime = {
  context: AudioContext;
  pushSample: (left: number, right: number) => void;
  close: () => void;
};

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
  onButtonUp
}: {
  pilot: Pilot;
  onButtonDown?: (button: ButtonName) => void;
  onButtonUp?: (button: ButtonName) => void;
}) {
  const Icon = pilot.role === "AI" ? Bot : UserRound;
  const roleLabel = pilot.role === "AI" ? "AI" : "玩家";
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
          <div className="pilot-role">{roleLabel} / {pilot.status}</div>
        </div>
      </div>
      <dl className="compact-grid">
        <div>
          <dt>模式</dt>
          <dd>{pilot.mode}</dd>
        </div>
        <div>
          <dt>策略</dt>
          <dd>{pilot.strategy}</dd>
        </div>
        <div>
          <dt>性格</dt>
          <dd>{pilot.temperament}</dd>
        </div>
      </dl>
      <ControllerView buttons={pilot.buttons} onButtonDown={onButtonDown} onButtonUp={onButtonUp} />
      <button className="switch-button" type="button">
        <Gamepad2 size={16} />
        <span>{pilot.role === "AI" ? "AI 待接入" : "手动输入"}</span>
      </button>
    </section>
  );
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

async function tryResumeAudioContext(context: AudioContext) {
  await Promise.race([
    context.resume().catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 1200))
  ]);
  return context.state === "running";
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
  onStartPulse: () => void;
  onInputSmoke: () => void;
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
        <button disabled={!hasRom} onClick={onStartPulse} type="button"><Gamepad2 size={15} /> 按开始键</button>
        <button disabled={!hasRom} onClick={onInputSmoke} type="button"><Zap size={15} /> 输入测试</button>
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
  const [status, setStatus] = useState<RuntimeStatus>("no-rom");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("off");
  const [message, setMessage] = useState("加载本地用户自有 ROM 后开始真实模拟器测试。");
  const [frameCount, setFrameCount] = useState(0);
  const [buttons, setButtons] = useState<ButtonState>(blankButtons);
  const [eventLog, setEventLog] = useState<string[]>([
    "PM：真实 ROM 测试路径已启用",
    "运行时：等待本地用户自有 ROM",
    "边界：仓库不提交、不打包 ROM",
    "BOT：战术层仍待接入"
  ]);

  const appendLog = useCallback((line: string) => {
    setEventLog((current) => [line, ...current].slice(0, 8));
  }, []);

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

  const setNesButton = useCallback((button: ButtonName, pressed: boolean) => {
    const nes = nesRef.current;
    if (!nes) return;
    if (pressed) nes.buttonDown(1, buttonMap[button]);
    else nes.buttonUp(1, buttonMap[button]);
    setButtons((current) => ({ ...current, [button]: pressed }));
  }, []);

  const pulseButton = useCallback((button: ButtonName, ms = 180) => {
    setNesButton(button, true);
    window.setTimeout(() => setNesButton(button, false), ms);
  }, [setNesButton]);

  const tickFrame = useCallback(() => {
    if (!runningRef.current) return;
    const nes = nesRef.current;
    if (nes) {
      nes.frame();
      frameRef.current += 1;
      if (frameRef.current % 10 === 0) setFrameCount(frameRef.current);
    }
  }, []);

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
      setButtons(blankButtons);
      setStatus("loaded");
      setMessage(`本地 ROM 已加载：${data.byteLength} 字节。`);
      appendLog(`运行时：本地 ROM 已加载（${data.byteLength} 字节）`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setStatus("error");
      setMessage(detail);
      appendLog(`运行错误：${detail}`);
    }
  }, [appendLog, createNes]);

  const resetRuntime = useCallback(() => {
    const nes = nesRef.current;
    if (!nes) return;
    setRunning(false);
    nes.reset();
    frameRef.current = 0;
    setFrameCount(0);
    setButtons(blankButtons);
    setStatus("loaded");
    appendLog("运行时：模拟器已重置");
  }, [appendLog, setRunning]);

  const runInputSmoke = useCallback(() => {
    if (!nesRef.current) return;
    setRunning(true);
    appendLog("输入测试：延迟按开始键，然后按住右 + B");
    window.setTimeout(() => pulseButton("start", 260), 1200);
    window.setTimeout(() => pulseButton("start", 260), 2600);
    window.setTimeout(() => {
      setNesButton("right", true);
      setNesButton("b", true);
    }, 3600);
    window.setTimeout(() => {
      setNesButton("right", false);
      setNesButton("b", false);
    }, 6200);
  }, [appendLog, pulseButton, setNesButton, setRunning]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const button = keyMap.get(event.key);
      if (!button) return;
      event.preventDefault();
      setNesButton(button, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const button = keyMap.get(event.key);
      if (!button) return;
      event.preventDefault();
      setNesButton(button, false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setNesButton]);

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
      runInputSmoke();
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
      name: "玩家",
      role: "Human",
      status: status === "running" ? "操作中" : statusLabel(status),
      mode: "手动",
      strategy: "输入测试",
      temperament: "操作者",
      buttons,
      accent: "blue"
    },
    {
      side: "2P",
      name: "AI 伙伴",
      role: "AI",
      status: "等待 FSM",
      mode: "待接入",
      strategy: "尚无快脑策略",
      temperament: "未分配",
      buttons: blankButtons,
      accent: "red"
    }
  ];

  return (
    <main className="cockpit">
      <header className="topbar">
        <div>
          <h1>FC AI 陪玩驾驶舱</h1>
          <p>浏览器产品平台 / 真实 ROM 冒烟运行时</p>
        </div>
        <div className="status-cluster">
          <span><Gauge size={16} /> 目标 60 FPS</span>
          <span><AlertTriangle size={16} /> {statusLabel(status)}</span>
          <span><Radio size={16} /> {audioLabel(audioStatus)}</span>
        </div>
      </header>
      <div className="layout">
        <PilotPanel pilot={pilots[0]} onButtonDown={(button) => setNesButton(button, true)} onButtonUp={(button) => setNesButton(button, false)} />
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
            onStartPulse={() => pulseButton("start", 220)}
            status={status}
          />
          <TacticalPanel />
          <LogPanel eventLog={eventLog} />
        </div>
        <PilotPanel pilot={pilots[1]} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
