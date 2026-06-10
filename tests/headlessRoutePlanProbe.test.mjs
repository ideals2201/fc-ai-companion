import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = fs.readFileSync(path, "utf8");
  const dependencySource = fs.readFileSync(new URL("../apps/browser-cockpit/src/contraStage1RewardTactics.ts", import.meta.url), "utf8");
  const dependency = ts.transpileModule(dependencySource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const dependencyUrl = `data:text/javascript;base64,${Buffer.from(dependency.outputText).toString("base64")}`;
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const outputText = transpiled.outputText.replace(/from "\.\/contraStage1RewardTactics"/g, `from "${dependencyUrl}"`);
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(dataUrl);
}

const {
  decideHeadlessRoutePlanProbeButtons
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/headlessRoutePlanProbe.ts", import.meta.url));

function snapshot(overrides = {}) {
  return {
    enemies: [],
    jumpState: 0,
    level: 0,
    playerX: 48,
    playerY: 100,
    weapon: 0,
    worldX: 48,
    ...overrides
  };
}

test("headless route-plan probe advances and pulse-fires speedrun start route", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 620,
    routeSegment: {
      id: "start-run",
      action: "advance",
      fire: "pulse",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot()
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.left, false);
});

test("headless route-plan probe jumps on configured grounded rhythm", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 300,
    routeSegment: {
      id: "rhythm",
      action: "advance",
      fire: "pulse",
      jumpEvery: 150,
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot()
  });

  assert.equal(buttons.a, true);
});

test("headless route-plan probe survival reacts to close threats instead of blind running", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 901,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 66, y: 104 }
      ]
    })
  });

  assert.equal(buttons.right, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.a, true);
});

test("headless route-plan probe holds fire in boss-wall route segment", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 3200,
    routeSegment: {
      id: "boss-wall",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({ playerY: 170, worldX: 3020 })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.down, true);
});

test("headless route-plan probe carries right while down-firing airborne close lower soldiers", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 878,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      jumpState: 1,
      playerX: 128,
      playerY: 80,
      worldX: 176,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 125, y: 100 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe applies controlled advance after a survival stall", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 6000,
    progressStallFrames: 1200,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      playerX: 128,
      playerY: 164,
      worldX: 271,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 161, y: 174 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe bails left from direct body overlap during survival", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 4626,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      playerX: 128,
      playerY: 164,
      worldX: 275,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 134, y: 151 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
});

test("headless route-plan probe bails right when direct body overlap is on the left side", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1603,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 177,
      playerX: 128,
      playerY: 188,
      worldX: 630,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 124, y: 185 }
      ]
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe uses the opening low fixed-threat route fragment before W288 contact", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1466,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      playerX: 128,
      playerY: 107,
      worldX: 286,
      enemies: [
        { fixed: false, hp: 1, kind: "object", threat: true, type: 0x01, x: 150, y: 178 },
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 142, y: 149 },
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 163, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, false);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe carries right through the early bridge low-lane contact window", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1810,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      playerX: 127,
      playerY: 212,
      worldX: 588,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 121, y: 185 },
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 156, y: 185 },
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 180, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe advances through the early bridge low fixed-threat stall before soldiers arrive", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1560,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 589,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 180, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe keeps a low firing posture at the early bridge fixed-body window", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1600,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 196,
      worldX: 624,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 145, y: 196 },
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x05, x: 167, y: 148 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
});

test("headless route-plan probe does not override direct overlap safety in the bridge fixed-body window", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1602,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 196,
      worldX: 632,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 137, y: 196 }
      ]
    })
  });

  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe advances away from an early bridge fixed target after passing it", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1640,
    routeSegment: {
      id: "bridge-survive",
      action: "survive",
      fire: "threat",
      worldStart: 520,
      worldEnd: 930
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 148,
      worldX: 647,
      enemies: [
        { fixed: true, hp: 1, kind: "enemy", threat: true, type: 0x06, x: 122, y: 196 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, true);
});

test("headless route-plan probe keeps right-up fire through the mid reward falling-threat window", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 3100,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1204,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 168, y: 171 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 188, y: 160 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, true);
});

test("headless route-plan probe lets close-body safety override the mid reward falling-threat rush", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 2676,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1206,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 126, y: 194 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 186, y: 160 }
      ]
    })
  });

  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.up, true);
});

test("headless route-plan probe can isolate the rejected W1205 falling-priority candidate", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-falling-threat-priority",
    frame: 7006,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1205,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 155, y: 178 },
        { fixed: false, hp: 1, kind: "object", threat: true, type: 0x01, x: 95, y: 232 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.up, true);
});

test("headless route-plan probe can isolate W1205 falling priority with a contact interrupt", () => {
  const earlyButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-falling-threat-contact-interrupt",
    frame: 2668,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1198,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 144, y: 188 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 186, y: 160 }
      ]
    })
  });

  assert.equal(earlyButtons.right, true);
  assert.equal(earlyButtons.left, false);
  assert.equal(earlyButtons.up, true);
  assert.equal(earlyButtons.a, true);

  const contactButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-falling-threat-contact-interrupt",
    frame: 2672,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1202,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 135, y: 191 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 186, y: 160 }
      ]
    })
  });

  assert.equal(contactButtons.left, true);
  assert.equal(contactButtons.right, false);
  assert.equal(contactButtons.up, true);
  assert.equal(contactButtons.a, true);
  assert.equal(contactButtons.b, true);
});

test("headless route-plan probe can isolate W1205 contact jump preload", () => {
  const preloadButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-contact-jump-preload",
    frame: 2668,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1198,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 144, y: 188 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 186, y: 160 }
      ]
    })
  });

  assert.equal(preloadButtons.right, true);
  assert.equal(preloadButtons.left, false);
  assert.equal(preloadButtons.up, true);
  assert.equal(preloadButtons.a, false);
  assert.equal(preloadButtons.b, true);

  const jumpButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-contact-jump-preload",
    frame: 2671,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1201,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 137, y: 191 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 186, y: 160 }
      ]
    })
  });

  assert.equal(jumpButtons.left, true);
  assert.equal(jumpButtons.right, false);
  assert.equal(jumpButtons.up, true);
  assert.equal(jumpButtons.a, true);
  assert.equal(jumpButtons.b, true);
});

test("headless route-plan probe can isolate W1205 precontact station clear", () => {
  const stationButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-precontact-station-clear",
    frame: 6997,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 120,
      playerY: 212,
      worldX: 1196,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 150, y: 178 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 188, y: 160 }
      ]
    })
  });

  assert.equal(stationButtons.left, false);
  assert.equal(stationButtons.right, false);
  assert.equal(stationButtons.up, true);
  assert.equal(stationButtons.down, false);
  assert.equal(stationButtons.a, false);
  assert.equal(stationButtons.b, true);

  const emergencyButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-precontact-station-clear",
    frame: 7006,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1205,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 135, y: 191 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 188, y: 160 }
      ]
    })
  });

  assert.equal(emergencyButtons.left, true);
  assert.equal(emergencyButtons.right, false);
  assert.equal(emergencyButtons.up, true);
  assert.equal(emergencyButtons.a, true);
  assert.equal(emergencyButtons.b, true);
});

test("headless route-plan probe can isolate W1205 force-upright through", () => {
  const approachButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-force-upright-through",
    frame: 2658,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1188,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 167, y: 181 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 188, y: 160 }
      ]
    })
  });

  assert.equal(approachButtons.left, false);
  assert.equal(approachButtons.right, true);
  assert.equal(approachButtons.up, true);
  assert.equal(approachButtons.down, false);
  assert.equal(approachButtons.a, false);
  assert.equal(approachButtons.b, true);

  const closeButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-force-upright-through",
    frame: 2680,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1205,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 138, y: 197 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 188, y: 160 }
      ]
    })
  });

  assert.equal(closeButtons.left, false);
  assert.equal(closeButtons.right, true);
  assert.equal(closeButtons.up, true);
  assert.equal(closeButtons.a, false);
  assert.equal(closeButtons.b, true);
});

test("headless route-plan probe can isolate W1205 duck-under contact", () => {
  const approachButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-duck-under-contact",
    frame: 2658,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1188,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 167, y: 181 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 188, y: 160 }
      ]
    })
  });

  assert.equal(approachButtons.left, false);
  assert.equal(approachButtons.right, true);
  assert.equal(approachButtons.up, false);
  assert.equal(approachButtons.down, false);
  assert.equal(approachButtons.a, false);
  assert.equal(approachButtons.b, true);

  const contactButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-duck-under-contact",
    frame: 2676,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1206,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 126, y: 194 },
        { fixed: true, hp: 8, kind: "durable", threat: true, type: 0x04, x: 186, y: 160 }
      ]
    })
  });

  assert.equal(contactButtons.left, false);
  assert.equal(contactButtons.right, true);
  assert.equal(contactButtons.up, false);
  assert.equal(contactButtons.down, true);
  assert.equal(contactButtons.a, false);
  assert.equal(contactButtons.b, true);
});

test("headless route-plan probe can isolate W1205 pulsed right fire", () => {
  const releaseButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-pulsed-right-fire",
    frame: 2658,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1188,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 167, y: 181 }
      ]
    })
  });

  assert.equal(releaseButtons.left, false);
  assert.equal(releaseButtons.right, true);
  assert.equal(releaseButtons.up, false);
  assert.equal(releaseButtons.down, false);
  assert.equal(releaseButtons.a, false);
  assert.equal(releaseButtons.b, false);

  const pulseButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-pulsed-right-fire",
    frame: 2664,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1194,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 153, y: 185 }
      ]
    })
  });

  assert.equal(pulseButtons.left, false);
  assert.equal(pulseButtons.right, true);
  assert.equal(pulseButtons.up, false);
  assert.equal(pulseButtons.down, false);
  assert.equal(pulseButtons.a, false);
  assert.equal(pulseButtons.b, true);
});

test("headless route-plan probe can isolate W1205 post-retreat low-lane recovery", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-post-retreat-low-lane-recovery",
    frame: 6930,
    progressStallFrames: 930,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 65,
      playerY: 212,
      worldX: 1141,
      enemies: [
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 61, y: 222 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 79, y: 223 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 77, y: 232 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.up, false);
  assert.equal(buttons.down, true);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can isolate W1205 vertical fixed-target station", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-vertical-fixed-station",
    frame: 7006,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1205,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 155, y: 178 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(buttons.up, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.right, false);
  assert.equal(buttons.a, false);
});

test("headless route-plan probe can isolate W1205 post-upper recovery", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-post-upper-recovery",
    frame: 7065,
    progressStallFrames: 59,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1146,
      enemies: [
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 61, y: 222 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 79, y: 222 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 77, y: 232 },
        { fixed: false, hp: 0, kind: "object", routine: 0, threat: true, type: 0x05, x: 72, y: 140 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(buttons.up, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.down, false);
});

test("headless route-plan probe can isolate W1205 post-upper safe recovery", () => {
  const contactButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-post-upper-safe-recovery",
    frame: 2802,
    progressStallFrames: 0,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1151,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 75, y: 214 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(contactButtons.left, true);
  assert.equal(contactButtons.right, false);
  assert.equal(contactButtons.a, true);
  assert.equal(contactButtons.b, true);

  const recoveryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1205-post-upper-safe-recovery",
    frame: 2830,
    progressStallFrames: 0,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1151,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(recoveryButtons.left, false);
  assert.equal(recoveryButtons.right, true);
  assert.equal(recoveryButtons.up, true);
  assert.equal(recoveryButtons.down, false);
  assert.equal(recoveryButtons.a, false);
  assert.equal(recoveryButtons.b, true);
});

test("headless route-plan probe can isolate W1360 right-under station crowd escape", () => {
  const w1205RecoveryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1360-right-under-station-crowd",
    frame: 2830,
    progressStallFrames: 0,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1151,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1205RecoveryButtons.left, false);
  assert.equal(w1205RecoveryButtons.right, true);
  assert.equal(w1205RecoveryButtons.up, true);
  assert.equal(w1205RecoveryButtons.b, true);

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1360-right-under-station-crowd",
    frame: 7113,
    progressStallFrames: 7,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 123,
      playerY: 212,
      worldX: 1361,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 126, y: 186 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 193, y: 217 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 123, y: 112 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can isolate W1726 danger low-side body escape", () => {
  const w1205RecoveryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1726-danger-low-side-body",
    frame: 2830,
    progressStallFrames: 0,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1151,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1205RecoveryButtons.right, true);
  assert.equal(w1205RecoveryButtons.up, true);
  assert.equal(w1205RecoveryButtons.b, true);

  const w1360Buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1726-danger-low-side-body",
    frame: 7113,
    progressStallFrames: 7,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 123,
      playerY: 212,
      worldX: 1361,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 126, y: 186 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1360Buttons.right, true);
  assert.equal(w1360Buttons.left, false);
  assert.equal(w1360Buttons.up, true);

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1726-danger-low-side-body",
    frame: 9078,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 81,
      playerX: 111,
      playerY: 173,
      worldX: 1727,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 115, y: 196 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 143, y: 174 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 133, y: 186 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);

});

test("headless route-plan probe can isolate W1660 retreat-regression guard", () => {
  const w1205RecoveryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1660-retreat-regression-guard",
    frame: 2830,
    progressStallFrames: 0,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1151,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1205RecoveryButtons.right, true);
  assert.equal(w1205RecoveryButtons.up, true);
  assert.equal(w1205RecoveryButtons.b, true);

  const w1360Buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1660-retreat-regression-guard",
    frame: 7113,
    progressStallFrames: 7,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 123,
      playerY: 212,
      worldX: 1361,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 126, y: 186 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1360Buttons.right, true);
  assert.equal(w1360Buttons.left, false);
  assert.equal(w1360Buttons.up, true);

  const w1726Buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1660-retreat-regression-guard",
    frame: 9078,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 81,
      playerX: 111,
      playerY: 173,
      worldX: 1727,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 115, y: 196 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 143, y: 174 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1726Buttons.right, true);
  assert.equal(w1726Buttons.down, true);
  assert.equal(w1726Buttons.b, true);

  const leftEdgeButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1660-retreat-regression-guard",
    frame: 9861,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 25,
      playerY: 212,
      worldX: 1641,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 32, y: 194 },
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 218 },
        { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(leftEdgeButtons.left, false);
  assert.equal(leftEdgeButtons.right, false);
  assert.equal(leftEdgeButtons.up, false);
  assert.equal(leftEdgeButtons.down, true);
  assert.equal(leftEdgeButtons.a, false);
  assert.equal(leftEdgeButtons.b, true);

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1660-retreat-regression-guard",
    frame: 10409,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 45,
      playerY: 212,
      worldX: 1661,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 210 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 32, y: 200 },
        { fixed: true, hp: 240, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can isolate W1641 left-edge right-jump escape", () => {
  const w1205RecoveryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1641-left-edge-right-jump",
    frame: 2830,
    progressStallFrames: 0,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1151,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1205RecoveryButtons.right, true);
  assert.equal(w1205RecoveryButtons.up, true);
  assert.equal(w1205RecoveryButtons.b, true);

  const w1360Buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1641-left-edge-right-jump",
    frame: 7113,
    progressStallFrames: 7,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 123,
      playerY: 212,
      worldX: 1361,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 126, y: 186 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1360Buttons.right, true);
  assert.equal(w1360Buttons.left, false);
  assert.equal(w1360Buttons.up, true);

  const w1726Buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1641-left-edge-right-jump",
    frame: 9078,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 81,
      playerX: 111,
      playerY: 173,
      worldX: 1727,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 115, y: 196 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 143, y: 174 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(w1726Buttons.right, true);
  assert.equal(w1726Buttons.down, true);
  assert.equal(w1726Buttons.b, true);

  const leftEdgeButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1641-left-edge-right-jump",
    frame: 9850,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 29,
      playerY: 212,
      worldX: 1645,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 32, y: 178 },
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 210 },
        { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(leftEdgeButtons.left, false);
  assert.equal(leftEdgeButtons.right, true);
  assert.equal(leftEdgeButtons.up, true);
  assert.equal(leftEdgeButtons.down, false);
  assert.equal(leftEdgeButtons.a, true);
  assert.equal(leftEdgeButtons.b, true);

  const w1660Buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1641-left-edge-right-jump",
    frame: 10409,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 45,
      playerY: 212,
      worldX: 1661,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 210 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 32, y: 200 },
        { fixed: true, hp: 240, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(w1660Buttons.left, false);
  assert.equal(w1660Buttons.right, true);
  assert.equal(w1660Buttons.up, true);
  assert.equal(w1660Buttons.down, false);
  assert.equal(w1660Buttons.a, false);
  assert.equal(w1660Buttons.b, true);
});

test("headless route-plan probe can isolate W1648 left-edge precompression advance", () => {
  const inheritedLeftEdgeButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1648-left-edge-precompression-advance",
    frame: 9850,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 32,
      playerY: 212,
      worldX: 1648,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 32, y: 178 },
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 210 },
        { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(inheritedLeftEdgeButtons.left, false);
  assert.equal(inheritedLeftEdgeButtons.right, true);
  assert.equal(inheritedLeftEdgeButtons.up, true);
  assert.equal(inheritedLeftEdgeButtons.down, false);
  assert.equal(inheritedLeftEdgeButtons.a, true);
  assert.equal(inheritedLeftEdgeButtons.b, true);

  const precompressionButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1648-left-edge-precompression-advance",
    frame: 9828,
    progressStallFrames: 787,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 34,
      playerY: 212,
      worldX: 1650,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 52, y: 227 },
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 218 },
        { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(precompressionButtons.left, false);
  assert.equal(precompressionButtons.right, true);
  assert.equal(precompressionButtons.up, true);
  assert.equal(precompressionButtons.down, false);
  assert.equal(precompressionButtons.a, true);
  assert.equal(precompressionButtons.b, true);
});

test("headless route-plan probe can isolate W1664 same-lane preclear pulse", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const sameLaneSnapshot = snapshot({
    jumpState: 0,
    playerX: 48,
    playerY: 212,
    worldX: 1664,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 0, threat: true, type: 0x05, x: 66, y: 218 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 43, y: 232 }
    ]
  });

  const releaseButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1664-same-lane-preclear-pulse",
    frame: 10932,
    progressStallFrames: 0,
    routeSegment,
    snapshot: sameLaneSnapshot
  });

  assert.equal(releaseButtons.left, false);
  assert.equal(releaseButtons.right, true);
  assert.equal(releaseButtons.down, true);
  assert.equal(releaseButtons.up, false);
  assert.equal(releaseButtons.a, false);
  assert.equal(releaseButtons.b, false);

  const fireButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1664-same-lane-preclear-pulse",
    frame: 10934,
    progressStallFrames: 0,
    routeSegment,
    snapshot: sameLaneSnapshot
  });

  assert.equal(fireButtons.left, false);
  assert.equal(fireButtons.right, true);
  assert.equal(fireButtons.down, true);
  assert.equal(fireButtons.up, false);
  assert.equal(fireButtons.a, false);
  assert.equal(fireButtons.b, true);
});

test("headless route-plan probe can isolate W1658 overhead body guard before same-lane preclear", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };

  const overheadButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1658-overhead-guard-preclear",
    frame: 9861,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 42,
      playerY: 212,
      worldX: 1658,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 32, y: 194 },
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 218 }
      ]
    })
  });

  assert.equal(overheadButtons.left, false);
  assert.equal(overheadButtons.right, true);
  assert.equal(overheadButtons.down, true);
  assert.equal(overheadButtons.up, false);
  assert.equal(overheadButtons.a, false);
  assert.equal(overheadButtons.b, true);

  const preclearButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1658-overhead-guard-preclear",
    frame: 10934,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 50,
      playerY: 212,
      worldX: 1666,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 0, threat: true, type: 0x05, x: 66, y: 218 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 43, y: 232 }
      ]
    })
  });

  assert.equal(preclearButtons.left, false);
  assert.equal(preclearButtons.right, true);
  assert.equal(preclearButtons.down, true);
  assert.equal(preclearButtons.up, false);
  assert.equal(preclearButtons.a, false);
  assert.equal(preclearButtons.b, true);
});

test("headless route-plan probe can isolate W1726 grounded overhead duck advance after W1658 guard", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };

  const overheadGuardButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1726-grounded-overhead-duck-advance",
    frame: 9861,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 42,
      playerY: 212,
      worldX: 1658,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 32, y: 194 },
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 66, y: 218 }
      ]
    })
  });

  assert.equal(overheadGuardButtons.left, false);
  assert.equal(overheadGuardButtons.right, true);
  assert.equal(overheadGuardButtons.down, true);
  assert.equal(overheadGuardButtons.up, false);
  assert.equal(overheadGuardButtons.a, false);
  assert.equal(overheadGuardButtons.b, true);

  const preclearButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1726-grounded-overhead-duck-advance",
    frame: 10934,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 50,
      playerY: 212,
      worldX: 1666,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 0, threat: true, type: 0x05, x: 66, y: 218 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 43, y: 232 }
      ]
    })
  });

  assert.equal(preclearButtons.left, false);
  assert.equal(preclearButtons.right, true);
  assert.equal(preclearButtons.down, true);
  assert.equal(preclearButtons.up, false);
  assert.equal(preclearButtons.a, false);
  assert.equal(preclearButtons.b, true);

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1726-grounded-overhead-duck-advance",
    frame: 10192,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 110,
      playerY: 212,
      worldX: 1726,
      enemies: [
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 98, y: 218 },
        { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x01, x: 109, y: 194 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);

  const heldButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1726-grounded-overhead-duck-advance",
    frame: 10196,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 111,
      playerY: 212,
      worldX: 1727,
      enemies: [
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 98, y: 218 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 104, y: 197 }
      ]
    })
  });

  assert.equal(heldButtons.left, false);
  assert.equal(heldButtons.right, true);
  assert.equal(heldButtons.down, true);
  assert.equal(heldButtons.up, false);
  assert.equal(heldButtons.a, false);
  assert.equal(heldButtons.b, true);
});

test("headless route-plan probe can isolate W1440 descent lower-body right carry", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1440-descent-lower-body-right-carry",
    frame: 9413,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 81,
      playerX: 108,
      playerY: 173,
      worldX: 1440,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 113, y: 196 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 87, y: 218 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can isolate W1678 forward-body duck carry", () => {
  const inheritedPrecompressionButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-forward-body-duck-carry",
    frame: 9828,
    progressStallFrames: 787,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 34,
      playerY: 212,
      worldX: 1650,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 52, y: 227 },
        { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(inheritedPrecompressionButtons.left, false);
  assert.equal(inheritedPrecompressionButtons.right, true);
  assert.equal(inheritedPrecompressionButtons.up, true);
  assert.equal(inheritedPrecompressionButtons.a, true);
  assert.equal(inheritedPrecompressionButtons.b, true);

  const rearLowBodyButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-forward-body-duck-carry",
    frame: 10970,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 86,
      playerY: 212,
      worldX: 1702,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 66, y: 218 },
        { fixed: true, hp: 7, kind: "durable", routine: 4, threat: true, type: 0x04, x: 37, y: 128 }
      ]
    })
  });

  assert.equal(rearLowBodyButtons.left, false);
  assert.equal(rearLowBodyButtons.right, true);
  assert.equal(rearLowBodyButtons.down, false);
  assert.equal(rearLowBodyButtons.up, true);
  assert.equal(rearLowBodyButtons.a, false);
  assert.equal(rearLowBodyButtons.b, true);

  const forwardUpperBodyButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-forward-body-duck-carry",
    frame: 10990,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 70,
      playerY: 212,
      worldX: 1686,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 76, y: 173 },
        { fixed: false, hp: 1, kind: "enemy", routine: 0, threat: true, type: 0x01, x: 43, y: 232 },
        { fixed: true, hp: 7, kind: "durable", routine: 4, threat: true, type: 0x04, x: 37, y: 128 }
      ]
    })
  });

  assert.equal(forwardUpperBodyButtons.left, false);
  assert.equal(forwardUpperBodyButtons.right, true);
  assert.equal(forwardUpperBodyButtons.down, true);
  assert.equal(forwardUpperBodyButtons.up, false);
  assert.equal(forwardUpperBodyButtons.a, false);
  assert.equal(forwardUpperBodyButtons.b, true);

  const contactEdgeButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-forward-body-duck-carry",
    frame: 10891,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1685,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 85, y: 208 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 68, y: 186 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 43, y: 232 }
      ]
    })
  });

  assert.equal(contactEdgeButtons.left, false);
  assert.equal(contactEdgeButtons.right, true);
  assert.equal(contactEdgeButtons.down, true);
  assert.equal(contactEdgeButtons.up, false);
  assert.equal(contactEdgeButtons.a, false);
  assert.equal(contactEdgeButtons.b, true);
});

test("headless route-plan probe can isolate W1678 forward-body level carry", () => {
  const inheritedPrecompressionButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-forward-body-level-carry",
    frame: 9828,
    progressStallFrames: 787,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 34,
      playerY: 212,
      worldX: 1650,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 52, y: 227 },
        { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(inheritedPrecompressionButtons.right, true);
  assert.equal(inheritedPrecompressionButtons.up, true);
  assert.equal(inheritedPrecompressionButtons.a, true);
  assert.equal(inheritedPrecompressionButtons.b, true);

  const contactEdgeButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-forward-body-level-carry",
    frame: 10891,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 69,
      playerY: 212,
      worldX: 1685,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 85, y: 208 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 68, y: 186 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 43, y: 232 }
      ]
    })
  });

  assert.equal(contactEdgeButtons.left, false);
  assert.equal(contactEdgeButtons.right, true);
  assert.equal(contactEdgeButtons.down, false);
  assert.equal(contactEdgeButtons.up, false);
  assert.equal(contactEdgeButtons.a, false);
  assert.equal(contactEdgeButtons.b, true);
});

test("headless route-plan probe can isolate W1678 low-stack jump clear", () => {
  const inheritedPrecompressionButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-low-stack-jump-clear",
    frame: 9828,
    progressStallFrames: 787,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 34,
      playerY: 212,
      worldX: 1650,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 52, y: 227 },
        { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 0x04, x: 32, y: 128 }
      ]
    })
  });

  assert.equal(inheritedPrecompressionButtons.left, false);
  assert.equal(inheritedPrecompressionButtons.right, true);
  assert.equal(inheritedPrecompressionButtons.up, true);
  assert.equal(inheritedPrecompressionButtons.a, true);
  assert.equal(inheritedPrecompressionButtons.b, true);

  const lowStackButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-low-stack-jump-clear",
    frame: 9259,
    progressStallFrames: 0,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 76,
      playerY: 212,
      worldX: 1692,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 85, y: 208 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 98, y: 218 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 93, y: 233 }
      ]
    })
  });

  assert.equal(lowStackButtons.left, false);
  assert.equal(lowStackButtons.right, true);
  assert.equal(lowStackButtons.down, false);
  assert.equal(lowStackButtons.up, true);
  assert.equal(lowStackButtons.a, true);
  assert.equal(lowStackButtons.b, true);
});

test("headless route-plan probe can isolate W1678 upper-body jump edge", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const upperBodySnapshot = snapshot({
    jumpState: 0,
    playerX: 63,
    playerY: 212,
    worldX: 1679,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 69, y: 186 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 43, y: 232 }
    ]
  });

  const releaseButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-upper-body-jump-edge",
    frame: 10998,
    progressStallFrames: 0,
    routeSegment,
    snapshot: upperBodySnapshot
  });

  assert.equal(releaseButtons.left, false);
  assert.equal(releaseButtons.right, true);
  assert.equal(releaseButtons.down, false);
  assert.equal(releaseButtons.up, true);
  assert.equal(releaseButtons.a, false);
  assert.equal(releaseButtons.b, true);

  const jumpButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-upper-body-jump-edge",
    frame: 10999,
    progressStallFrames: 0,
    routeSegment,
    snapshot: upperBodySnapshot
  });

  assert.equal(jumpButtons.left, false);
  assert.equal(jumpButtons.right, true);
  assert.equal(jumpButtons.down, false);
  assert.equal(jumpButtons.up, true);
  assert.equal(jumpButtons.a, true);
  assert.equal(jumpButtons.b, true);

  const carryThroughButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1678-upper-body-jump-edge",
    frame: 10892,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 67,
      playerY: 212,
      worldX: 1683,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 85, y: 208 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 68, y: 186 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 43, y: 232 }
      ]
    })
  });

  assert.equal(carryThroughButtons.left, false);
  assert.equal(carryThroughButtons.right, true);
  assert.equal(carryThroughButtons.down, false);
  assert.equal(carryThroughButtons.up, true);
  assert.equal(carryThroughButtons.a, true);
  assert.equal(carryThroughButtons.b, true);
});

test("headless route-plan probe ignores grounded low-lane object residue instead of stalling at the mid turret", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 4800,
    routeSegment: {
      id: "mid-survive",
      action: "survive",
      fire: "always",
      worldStart: 930,
      worldEnd: 1550
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 212,
      worldX: 1319,
      enemies: [
        { fixed: false, hp: 1, kind: "object", threat: true, type: 0x01, x: 115, y: 232 },
        { fixed: false, hp: 1, kind: "object", threat: true, type: 0x05, x: 171, y: 218 }
      ]
    })
  });

  assert.equal(buttons.right, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.down, false);
  assert.equal(buttons.b, true);
});
