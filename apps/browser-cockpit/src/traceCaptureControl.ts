export type TraceCaptureConfig = {
  id: string;
  startWorldX: number | null;
  endWorldX: number | null;
  stopOnDeath: boolean;
  stopOnEnd: boolean;
};

export type TraceCaptureSampleLike = {
  gameplayActive: boolean;
  ram: null | {
    deathFlag: number;
    p1State: number;
    worldX: number;
  };
};

function numberParam(params: URLSearchParams, name: string) {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function booleanParam(params: URLSearchParams, name: string, defaultValue: boolean) {
  const raw = params.get(name);
  if (raw === null) return defaultValue;
  return raw !== "0" && raw.toLowerCase() !== "false";
}

export function parseTraceCaptureConfig(search: string | URLSearchParams): TraceCaptureConfig | null {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const id = params.get("record");
  if (!id) return null;
  return {
    id,
    startWorldX: numberParam(params, "recordStart"),
    endWorldX: numberParam(params, "recordEnd"),
    stopOnDeath: booleanParam(params, "recordStopOnDeath", true),
    stopOnEnd: booleanParam(params, "recordStopOnEnd", true)
  };
}

export function shouldKeepTraceSample(sample: TraceCaptureSampleLike, config: TraceCaptureConfig | null) {
  if (!config) return true;
  if (!sample.ram) return false;
  if (config.startWorldX !== null && sample.ram.worldX < config.startWorldX) return false;
  if (config.endWorldX !== null && sample.ram.worldX > config.endWorldX) return false;
  return true;
}

export function shouldStopTraceCapture(
  sample: TraceCaptureSampleLike,
  config: TraceCaptureConfig | null,
  hasCapturedSamples: boolean
) {
  if (!config || !sample.ram || !hasCapturedSamples) return false;
  if (config.stopOnDeath && (sample.ram.p1State === 2 || sample.ram.deathFlag !== 0)) return true;
  if (config.stopOnEnd && config.endWorldX !== null && sample.ram.worldX > config.endWorldX) return true;
  return false;
}
