import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = fs.readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
  return import(dataUrl);
}

const {
  createCandidateStrategyFragmentProposal,
  createComparativeStrategyFragmentProposal
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/strategyFragmentProposal.ts", import.meta.url));

function evidence(overrides = {}) {
  return {
    schema: "fc-ai-strategy-trace-evidence-v1",
    branchOutcome: "window-complete",
    death: null,
    endWorldX: 1420,
    fragmentId: "candidate-1p-survival-v0-tas-opening-active",
    gameProfileId: "contra",
    inputSummary: { "right+B": 32, right: 280, "right+A": 6 },
    maxWorldX: 1420,
    progressionWindow: {
      metric: "progression.primary",
      start: 650,
      end: 1420,
      unit: "ProgressionUnits"
    },
    romProfileId: "contra-j-good",
    routeClass: "training:survival-v0:tas-opening-active",
    sampleCount: 318,
    side: "1P",
    stageId: "stage-1",
    startWorldX: 650,
    topEnemies: [],
    ...overrides
  };
}

function tasBaseline(overrides = {}) {
  return {
    movieId: "contra-j-2p-any-percent",
    sourceKind: "tas-side-split",
    side: "1P",
    windowId: "opening-active",
    label: "Opening active control",
    frameWindow: [650, 1350],
    rangeSemantics: "start-inclusive-end-exclusive",
    totalFrames: 700,
    pressedFrames: 642,
    pressedRatio: 0.9171,
    buttonPressFrames: {
      up: 0,
      down: 0,
      left: 0,
      right: 642,
      a: 2,
      b: 0,
      start: 0,
      select: 0
    },
    topInputPatterns: [
      { label: "→", frames: 640, ratio: 0.9143 },
      { label: "→A", frames: 2, ratio: 0.0029 }
    ],
    intentHints: ["advance"],
    acceptanceChecks: [
      "hash-exact-match-required",
      "real-runtime-trace-required",
      "safety-override-required",
      "side-owned-promotion-required"
    ],
    strategyTypes: ["survival", "speedrun", "combat"],
    promotionTarget: {
      gameProfileId: "contra",
      romProfileId: "contra-j-good",
      stageId: "stage-1",
      side: "1P",
      requiredValidation: "real-runtime-trace"
    },
    ...overrides
  };
}

test("generates a candidate StrategyFragment proposal from TAS baseline and TraceEvidence", () => {
  const proposal = createCandidateStrategyFragmentProposal({
    evidence: evidence(),
    tasSideBaseline: tasBaseline(),
    tasSideBaselinePath: "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
  });

  assert.equal(proposal.schema, "fc-ai-strategy-fragment-proposal-v1");
  assert.equal(proposal.fragment.status, "candidate");
  assert.equal(proposal.fragment.id, "candidate-fragment-1p-survival-v0-tas-opening-active");
  assert.equal(proposal.fragment.source.traceEvidence.fragmentId, "candidate-1p-survival-v0-tas-opening-active");
  assert.equal(proposal.fragment.source.tasSideBaseline.windowId, "opening-active");
  assert.equal(proposal.fragment.source.tasSideBaseline.path, "data/training/contra/tas_bases/contra-j-good/side-baselines.json");
  assert.equal(proposal.fragment.source.tasSideBaseline.tasIsController, false);
  assert.deepEqual(proposal.fragment.progressionWindow, {
    metric: "progression.primary",
    start: 650,
    end: 1420,
    unit: "ProgressionUnits",
    strictEnd: true
  });
  assert.ok(proposal.fragment.strategyTypes.includes("survival"));
  assert.ok(proposal.fragment.strategyTypes.includes("combat"));
  assert.ok(proposal.fragment.actionAdvice.intentCombination.some((item) => item.intent === "advance"));
  assert.ok(proposal.fragment.actionAdvice.intentCombination.some((item) => item.intent === "jump"));
  assert.equal("buttons" in proposal.fragment.actionAdvice, false);
  assert.ok(proposal.fragment.safetyOverrides.includes("real-runtime-trace-required"));
  assert.ok(proposal.fragment.safetyOverrides.includes("tas-desync-guard"));
  assert.ok(proposal.fragment.exitConditions.some((condition) => condition.ref === "validation.desynced"));
});

test("rejects TAS baseline side and ROMProfile mismatches", () => {
  assert.throws(
    () => createCandidateStrategyFragmentProposal({
      evidence: evidence(),
      tasSideBaseline: tasBaseline({ side: "2P", promotionTarget: { ...tasBaseline().promotionTarget, side: "2P" } }),
      tasSideBaselinePath: "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
    }),
    /TAS side baseline side mismatch/
  );

  assert.throws(
    () => createCandidateStrategyFragmentProposal({
      evidence: evidence(),
      tasSideBaseline: tasBaseline({
        promotionTarget: {
          ...tasBaseline().promotionTarget,
          romProfileId: "contra-us-good"
        }
      }),
      tasSideBaselinePath: "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
    }),
    /TAS side baseline ROMProfile mismatch/
  );
});

test("normalizes TAS strategy labels to declared package strategy types", () => {
  const proposal = createCandidateStrategyFragmentProposal({
    evidence: evidence({
      fragmentId: "candidate-2p-guard-v0-coop-advance-reference",
      routeClass: "training:guard-v0:tas-coop-advance-reference",
      side: "2P"
    }),
    tasSideBaseline: tasBaseline({
      side: "2P",
      windowId: "coop-advance-reference",
      strategyTypes: ["survival", "guard", "speedrun", "platform-capture", "coop-spacing"],
      promotionTarget: {
        ...tasBaseline().promotionTarget,
        side: "2P"
      }
    }),
    tasSideBaselinePath: "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
  });

  assert.ok(proposal.fragment.strategyTypes.includes("guard"));
  assert.ok(proposal.fragment.strategyTypes.includes("speed"));
  assert.ok(proposal.fragment.strategyTypes.includes("platform-capture"));
  assert.equal(proposal.fragment.strategyTypes.includes("coop-spacing"), false);
  assert.equal(proposal.fragment.strategyTypes.includes("speedrun"), false);
});

test("generates a comparative candidate StrategyFragment proposal for a rejected route class", () => {
  const primaryEvidence = evidence({
    branchOutcome: "route-class-progressed-failed-stop",
    endWorldX: 2174,
    fragmentId: "candidate-1p-combat-v0-boss-approach-early-pit-jump-death-worldx2174",
    inputSummary: { "down+right+B": 71, "up+right+B": 313 },
    maxWorldX: 2174,
    progressionWindow: {
      metric: "progression.primary",
      start: 2040,
      end: 2174,
      unit: "ContraWorldPixels"
    },
    routeClass: "runtime-patch:stage-one-boss-approach-early-pit-jump",
    sampleCount: 900
  });
  const rejectedEvidence = evidence({
    branchOutcome: "route-class-regressed-failed-stop",
    endWorldX: 2160,
    fragmentId: "candidate-1p-combat-v0-boss-approach-high-air-contact-death-worldx2160",
    inputSummary: { "up+right+A+B": 20, "up+left+A+B": 9 },
    maxWorldX: 2167,
    progressionWindow: {
      metric: "progression.primary",
      start: 2040,
      end: 2160,
      unit: "ContraWorldPixels"
    },
    routeClass: "runtime-patch:stage-one-boss-approach-high-air-contact",
    sampleCount: 141
  });

  const proposal = createComparativeStrategyFragmentProposal({
    evidence: primaryEvidence,
    rejectedEvidence: [rejectedEvidence],
    id: "candidate-fragment-1p-combat-v0-boss-approach-high-air-cluster",
    label: "Boss approach high-air cluster candidate",
    progressionWindow: {
      metric: "progression.primary",
      start: 2040,
      end: 2174,
      unit: "ContraWorldPixels",
      strictEnd: true
    },
    strategyTypes: ["survival", "combat", "recovery"],
    tasSideBaseline: tasBaseline({
      windowId: "boss-approach-platform-capture",
      label: "Boss approach platform capture",
      frameWindow: [2500, 3600],
      totalFrames: 1100,
      buttonPressFrames: {
        up: 1,
        down: 37,
        left: 5,
        right: 1057,
        a: 44,
        b: 125,
        start: 0,
        select: 0
      },
      strategyTypes: ["survival", "recovery", "platform-capture"]
    }),
    tasSideBaselinePath: "data/training/contra/tas_bases/contra-j-good/side-baselines.json"
  });

  assert.equal(proposal.schema, "fc-ai-strategy-fragment-proposal-v1");
  assert.equal(proposal.fragment.id, "candidate-fragment-1p-combat-v0-boss-approach-high-air-cluster");
  assert.equal(proposal.fragment.label, "Boss approach high-air cluster candidate");
  assert.equal(proposal.fragment.status, "candidate");
  assert.deepEqual(proposal.fragment.progressionWindow, {
    metric: "progression.primary",
    start: 2040,
    end: 2174,
    unit: "ContraWorldPixels",
    strictEnd: true
  });
  assert.ok(proposal.fragment.strategyTypes.includes("combat"));
  assert.ok(proposal.fragment.strategyTypes.includes("recovery"));
  assert.equal(proposal.fragment.source.traceEvidence.fragmentId, primaryEvidence.fragmentId);
  assert.equal(proposal.fragment.source.rejectedTraceEvidence[0].fragmentId, rejectedEvidence.fragmentId);
  assert.equal(proposal.fragment.source.rejectedTraceEvidence[0].branchOutcome, "route-class-regressed-failed-stop");
  assert.equal(proposal.fragment.source.tasSideBaseline.windowId, "boss-approach-platform-capture");
  assert.equal(proposal.fragment.source.tasSideBaseline.tasIsController, false);
  assert.equal(proposal.fragment.actionAdvice.parameters.prohibitedRouteClass, "runtime-patch:stage-one-boss-approach-high-air-contact");
  assert.equal(proposal.fragment.actionAdvice.parameters.requiredValidation, "real-runtime-trace");
  assert.ok(proposal.fragment.safetyOverrides.includes("rejected-route-class-guard"));
  assert.equal("buttons" in proposal.fragment.actionAdvice, false);
});
