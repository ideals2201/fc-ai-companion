import React from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  Gamepad2,
  Gauge,
  HeartPulse,
  Map,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  Target,
  UserRound
} from "lucide-react";
import "./styles.css";

type ButtonState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  start: boolean;
  select: boolean;
};

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

const pilots: Pilot[] = [
  {
    side: "1P",
    name: "Player",
    role: "Human",
    status: "ready",
    mode: "manual",
    strategy: "co-play",
    temperament: "leader",
    buttons: {
      up: false,
      down: false,
      left: false,
      right: true,
      a: false,
      b: true,
      start: false,
      select: false
    },
    accent: "blue"
  },
  {
    side: "2P",
    name: "AI Partner",
    role: "AI",
    status: "tactical scan",
    mode: "assist",
    strategy: "survival first",
    temperament: "hot-blooded",
    buttons: {
      up: false,
      down: false,
      left: false,
      right: true,
      a: true,
      b: true,
      start: false,
      select: false
    },
    accent: "red"
  }
];

const tacticalStack = [
  { label: "Survival", value: "active", icon: Shield },
  { label: "Route", value: "WorldX pending", icon: Map },
  { label: "Cooperation", value: "queued", icon: HeartPulse },
  { label: "Combat", value: "basic fire", icon: Target },
  { label: "Advance", value: "gated", icon: Activity }
];

const eventLog = [
  "PM: browser cockpit shell online",
  "RAM: waiting for emulator adapter",
  "BOT: action ability exists; tactical layer pending",
  "RULE: survival > route > cooperation > combat > advance",
  "BOUNDARY: no ROM, no CV, no LLM fast-brain control"
];

function PadButton({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={active ? "pad-button active" : "pad-button"}>{label}</span>
  );
}

function Controller({ buttons }: { buttons: ButtonState }) {
  return (
    <div className="controller" aria-label="Realtime controller">
      <div className="dpad">
        <PadButton label="U" active={buttons.up} />
        <div className="dpad-mid">
          <PadButton label="L" active={buttons.left} />
          <PadButton label="R" active={buttons.right} />
        </div>
        <PadButton label="D" active={buttons.down} />
      </div>
      <div className="system-buttons">
        <PadButton label="SELECT" active={buttons.select} />
        <PadButton label="START" active={buttons.start} />
      </div>
      <div className="action-buttons">
        <PadButton label="B" active={buttons.b} />
        <PadButton label="A" active={buttons.a} />
      </div>
    </div>
  );
}

function PilotPanel({ pilot }: { pilot: Pilot }) {
  const Icon = pilot.role === "AI" ? Bot : UserRound;
  return (
    <section className={`pilot-panel ${pilot.accent}`}>
      <div className="panel-title">
        <Icon size={18} />
        <span>{pilot.side} Control Pod</span>
      </div>
      <div className="pilot-card">
        <div className="avatar">
          <Icon size={34} />
        </div>
        <div>
          <div className="pilot-name">{pilot.name}</div>
          <div className="pilot-role">{pilot.role} / {pilot.status}</div>
        </div>
      </div>
      <dl className="compact-grid">
        <div>
          <dt>Mode</dt>
          <dd>{pilot.mode}</dd>
        </div>
        <div>
          <dt>Strategy</dt>
          <dd>{pilot.strategy}</dd>
        </div>
        <div>
          <dt>Persona</dt>
          <dd>{pilot.temperament}</dd>
        </div>
      </dl>
      <Controller buttons={pilot.buttons} />
      <button className="switch-button" type="button">
        <Gamepad2 size={16} />
        <span>{pilot.role === "AI" ? "Take Over" : "Hand To AI"}</span>
      </button>
    </section>
  );
}

function GameViewport() {
  return (
    <section className="game-stage" aria-label="Game viewport">
      <div className="synergy-bar">
        <span>Synergy</span>
        <div className="meter">
          <span style={{ width: "72%" }} />
        </div>
        <strong>72</strong>
      </div>
      <div className="crt">
        <div className="pixel-scene">
          <div className="mountains" />
          <div className="trees" />
          <div className="ground" />
          <div className="player one" />
          <div className="player two" />
          <div className="projectile" />
          <div className="speech one">Cover me!</div>
          <div className="speech two">Danger ahead.</div>
        </div>
      </div>
      <div className="stage-toolbar">
        <button type="button"><Play size={15} /> Start</button>
        <button type="button"><Pause size={15} /> Pause</button>
        <button type="button"><RotateCcw size={15} /> Reset</button>
      </div>
    </section>
  );
}

function TacticalPanel() {
  return (
    <section className="tactical-panel">
      <div className="panel-title">
        <Brain size={18} />
        <span>Fast Brain</span>
      </div>
      <div className="state-strip">
        <div>
          <dt>CameraX</dt>
          <dd>pending</dd>
        </div>
        <div>
          <dt>PlayerX</dt>
          <dd>pending</dd>
        </div>
        <div>
          <dt>WorldX</dt>
          <dd>pending</dd>
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

function LogPanel() {
  return (
    <section className="log-panel">
      <div className="panel-title">
        <Radio size={18} />
        <span>Event Stream</span>
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
  return (
    <main className="cockpit">
      <header className="topbar">
        <div>
          <h1>FC AI Companion Cockpit</h1>
          <p>Browser product platform / tactical baseline build</p>
        </div>
        <div className="status-cluster">
          <span><Gauge size={16} /> 60 FPS target</span>
          <span><AlertTriangle size={16} /> No ROM loaded</span>
        </div>
      </header>
      <div className="layout">
        <PilotPanel pilot={pilots[0]} />
        <div className="center-column">
          <GameViewport />
          <TacticalPanel />
          <LogPanel />
        </div>
        <PilotPanel pilot={pilots[1]} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
