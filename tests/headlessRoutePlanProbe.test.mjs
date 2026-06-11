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
  const outputText = transpiled.outputText.replace(/from "\.\/([^"]+)"/g, (_match, specifier) => {
    const dependencyPath = new URL(`../apps/browser-cockpit/src/${specifier}.ts`, import.meta.url);
    return `from "${importTypeScriptModuleUrl(dependencyPath)}"`;
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(dataUrl);
}

function importTypeScriptModuleUrl(path) {
  const source = fs.readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const outputText = transpiled.outputText.replace(/from "\.\/([^"]+)"/g, (_match, specifier) => {
    const dependencyPath = new URL(`../apps/browser-cockpit/src/${specifier}.ts`, import.meta.url);
    return `from "${importTypeScriptModuleUrl(dependencyPath)}"`;
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
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

test("headless route-plan probe preserves boss-wall close body bailout at W3194", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 8266,
    routeSegment: {
      id: "boss-wall-survive",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 123, y: 169 },
        { fixed: true, hp: 32, kind: "durable", routine: 2, threat: true, type: 0x11, x: 161, y: 176 },
        { fixed: true, hp: 10, kind: "durable", routine: 2, threat: true, type: 0x10, x: 153, y: 128 }
      ],
      jumpState: 81,
      playerX: 122,
      playerY: 172,
      weapon: 0,
      worldX: 3194
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
});

test("headless route-plan probe uses boss-wall right-up fire while forward falling body is still above", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 8260,
    routeSegment: {
      id: "boss-wall-survive",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 130, y: 154 },
        { fixed: true, hp: 32, kind: "durable", routine: 2, threat: true, type: 0x11, x: 161, y: 176 },
        { fixed: true, hp: 10, kind: "durable", routine: 2, threat: true, type: 0x10, x: 153, y: 128 }
      ],
      jumpState: 49,
      playerX: 128,
      playerY: 192,
      weapon: 0,
      worldX: 3200
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe moves right from a rear falling body in the boss-wall lane", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 8328,
    routeSegment: {
      id: "boss-wall-survive",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 124, y: 154 },
        { fixed: true, hp: 31, kind: "durable", routine: 2, threat: true, type: 0x11, x: 161, y: 176 },
        { fixed: true, hp: 9, kind: "durable", routine: 2, threat: true, type: 0x10, x: 153, y: 128 }
      ],
      jumpState: 81,
      playerX: 127,
      playerY: 189,
      weapon: 0,
      worldX: 3199
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe moves right-up when upper boss-wall station has rear overlap", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 8414,
    routeSegment: {
      id: "boss-wall-survive",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 130, y: 137 },
        { fixed: true, hp: 3, kind: "durable", routine: 2, threat: true, type: 0x10, x: 153, y: 128 },
        { fixed: true, hp: 14, kind: "durable", routine: 2, threat: true, type: 0x10, x: 177, y: 128 },
        { fixed: true, hp: 30, kind: "durable", routine: 2, threat: true, type: 0x11, x: 161, y: 176 }
      ],
      jumpState: 49,
      playerX: 136,
      playerY: 142,
      weapon: 0,
      worldX: 3208
    })
  });

  assert.equal(buttons.b, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
});

test("headless route-plan probe lets boss-wall safety override candidate right-fire at W3208", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateOverlay: {
      id: "w3180-3230-right-fire-core-station",
      action: "right_fire",
      guard: {
        playerX: [118, 150],
        playerY: [90, 210],
        worldX: [3180, 3230]
      }
    },
    frame: 14317,
    routeSegment: {
      id: "boss-wall-survive",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", threat: true, type: 0x01, x: 131, y: 192 },
        { fixed: true, hp: 32, kind: "durable", threat: true, type: 0x11, x: 161, y: 176 }
      ],
      jumpState: 0,
      playerX: 136,
      playerY: 196,
      weapon: 0,
      worldX: 3208
    })
  });

  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
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

test("headless route-plan probe stops advancing at the Contra Japan W241 air-close type5 contact", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 1707,
    routeSegment: {
      id: "start-survive",
      action: "survive",
      fire: "threat",
      worldStart: 0,
      worldEnd: 520
    },
    snapshot: snapshot({
      jumpState: 177,
      playerX: 83,
      playerY: 84,
      worldX: 240,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 92, y: 100, vx: -1, vy: 0 },
        { fixed: true, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x02, x: 180, y: 160, vx: 0, vy: 0 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, false);
  assert.equal(buttons.up, false);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
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

test("headless route-plan probe applies W1440 descent carry in the default survival route", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 9413,
    progressStallFrames: 48,
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

test("headless route-plan probe can isolate W1454 airborne fixed-contact right carry", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1454-airborne-fixed-contact-right-carry",
    frame: 9393,
    progressStallFrames: 28,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 122,
      playerY: 138,
      worldX: 1454,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 133, y: 196 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 87, y: 218 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);

  const descentButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1454-airborne-fixed-contact-right-carry",
    frame: 9413,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 81,
      playerX: 112,
      playerY: 173,
      worldX: 1444,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 113, y: 196 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 87, y: 218 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
      ]
    })
  });

  assert.equal(descentButtons.left, false);
  assert.equal(descentButtons.right, true);
  assert.equal(descentButtons.down, true);
  assert.equal(descentButtons.up, false);
  assert.equal(descentButtons.a, false);
  assert.equal(descentButtons.b, true);
});

test("headless route-plan probe applies W1454 fixed-contact carry in the default survival route", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 9393,
    progressStallFrames: 28,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 122,
      playerY: 138,
      worldX: 1454,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 133, y: 196 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 87, y: 218 }
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

test("headless route-plan probe keeps W1454 carry when the lower soldier is barely ahead", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 9395,
    progressStallFrames: 30,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 124,
      playerY: 139,
      worldX: 1456,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 131, y: 196 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 163, y: 94 }
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

test("headless route-plan probe can isolate W1454 airborne fixed-contact pulse carry", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };
  const fixedContactSnapshot = snapshot({
    jumpState: 49,
    playerX: 119,
    playerY: 137,
    worldX: 1451,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 135, y: 190 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 87, y: 218 }
    ]
  });

  const releaseButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1454-airborne-fixed-contact-pulse-carry",
    frame: 9390,
    progressStallFrames: 28,
    routeSegment,
    snapshot: fixedContactSnapshot
  });

  assert.equal(releaseButtons.left, false);
  assert.equal(releaseButtons.right, true);
  assert.equal(releaseButtons.down, true);
  assert.equal(releaseButtons.up, false);
  assert.equal(releaseButtons.a, false);
  assert.equal(releaseButtons.b, false);

  const fireButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1454-airborne-fixed-contact-pulse-carry",
    frame: 9392,
    progressStallFrames: 30,
    routeSegment,
    snapshot: {
      ...fixedContactSnapshot,
      playerX: 121,
      playerY: 138,
      worldX: 1453,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 134, y: 196 },
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 87, y: 218 }
      ]
    }
  });

  assert.equal(fireButtons.left, false);
  assert.equal(fireButtons.right, true);
  assert.equal(fireButtons.down, true);
  assert.equal(fireButtons.up, false);
  assert.equal(fireButtons.a, false);
  assert.equal(fireButtons.b, true);
});

test("headless route-plan probe can isolate W1456 air-route hold-right formation", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const ascentButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1456-air-route-hold-right",
    frame: 9365,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 128,
      playerY: 181,
      worldX: 1460,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 151, y: 147, vx: -1, vy: 0 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 123, y: 112 }
      ]
    })
  });

  assert.equal(ascentButtons.left, false);
  assert.equal(ascentButtons.right, true);
  assert.equal(ascentButtons.up, true);
  assert.equal(ascentButtons.down, false);
  assert.equal(ascentButtons.a, false);
  assert.equal(ascentButtons.b, true);

  const descentButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1456-air-route-hold-right",
    frame: 9378,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 81,
      playerX: 115,
      playerY: 148,
      worldX: 1447,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 143, y: 164, vx: -1, vy: 1 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 123, y: 112 }
      ]
    })
  });

  assert.equal(descentButtons.left, false);
  assert.equal(descentButtons.right, true);
  assert.equal(descentButtons.up, false);
  assert.equal(descentButtons.down, true);
  assert.equal(descentButtons.a, false);
  assert.equal(descentButtons.b, true);

  const runtimeDescentButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1456-air-route-hold-right",
    frame: 9378,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 126,
      playerY: 148,
      worldX: 1461,
      enemies: [
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 140, y: 164, vx: -1, vy: 1 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 123, y: 112 }
      ]
    })
  });

  assert.equal(runtimeDescentButtons.left, false);
  assert.equal(runtimeDescentButtons.right, true);
  assert.equal(runtimeDescentButtons.up, false);
  assert.equal(runtimeDescentButtons.down, true);
  assert.equal(runtimeDescentButtons.a, false);
  assert.equal(runtimeDescentButtons.b, true);
});

test("headless route-plan probe applies W1456 air-route hold-right in the default survival route", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 9365,
    progressStallFrames: 0,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 128,
      playerY: 181,
      worldX: 1460,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 151, y: 147, vx: -1, vy: 0 },
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

test("headless route-plan probe breaks the Contra Japan W1471 grounded stall with right-up fire", () => {
  const routeSegment = {
    id: "mid-survive",
    action: "survive",
    fire: "always",
    worldStart: 930,
    worldEnd: 1550
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 11924,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 196,
      weapon: 0,
      worldX: 1471,
      enemies: [
        { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 114, y: 232 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 198, y: 176 },
        { fixed: true, hp: 8, kind: "durable", routine: 0, threat: true, type: 0x04, x: 22, y: 160 }
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

test("headless route-plan probe can isolate W1735 danger stack right carry after W1456 route formation", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const preLostSnapshot = snapshot({
    jumpState: 81,
    playerX: 113,
    playerY: 173,
    worldX: 1736,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 117, y: 186 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 125, y: 196 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const previousW1456OnlyButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1456-air-route-hold-right",
    frame: 11977,
    routeSegment,
    snapshot: preLostSnapshot
  });

  assert.equal(previousW1456OnlyButtons.left, true, "the previous W1456-only chain still retreats into contact here");
  assert.equal(previousW1456OnlyButtons.right, false);

  const inheritedDangerStackButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1735-danger-stack-right-carry",
    frame: 11977,
    routeSegment,
    snapshot: preLostSnapshot
  });

  assert.equal(inheritedDangerStackButtons.left, false);
  assert.equal(inheritedDangerStackButtons.right, true);
  assert.equal(inheritedDangerStackButtons.down, true);
  assert.equal(inheritedDangerStackButtons.up, false);
  assert.equal(inheritedDangerStackButtons.a, false);
  assert.equal(inheritedDangerStackButtons.b, true);
});

test("headless route-plan probe can isolate W1735 same-lane contact right carry", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const sameLaneSnapshot = snapshot({
    jumpState: 81,
    playerX: 117,
    playerY: 173,
    worldX: 1740,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 117, y: 186 },
      { fixed: false, hp: 0, kind: "enemy", routine: 6, threat: true, type: 0x05, x: 126, y: 196 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const previousStackButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1735-danger-stack-right-carry",
    frame: 11977,
    routeSegment,
    snapshot: sameLaneSnapshot
  });

  assert.equal(previousStackButtons.left, true, "the wider stack inheritance still misses the same-lane dy=13 contact");
  assert.equal(previousStackButtons.right, false);

  const sameLaneButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1735-same-lane-right-carry",
    frame: 11977,
    routeSegment,
    snapshot: sameLaneSnapshot
  });

  assert.equal(sameLaneButtons.left, false);
  assert.equal(sameLaneButtons.right, true);
  assert.equal(sameLaneButtons.down, true);
  assert.equal(sameLaneButtons.up, false);
  assert.equal(sameLaneButtons.a, false);
  assert.equal(sameLaneButtons.b, true);
});

test("headless route-plan probe can isolate W1751 precontact right-fire route correction", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const precontactSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 151,
    worldX: 1751,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 164, y: 158, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 102, y: 173, vx: 1, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 162, y: 196, vx: -1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const previousW1456Buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1456-air-route-hold-right",
    frame: 11940,
    routeSegment,
    snapshot: precontactSnapshot
  });

  assert.equal(previousW1456Buttons.left, true, "the W1456-only chain still retreats left at W1751");
  assert.equal(previousW1456Buttons.right, false);

  const correctedButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1751-precontact-right-fire",
    frame: 11940,
    routeSegment,
    snapshot: precontactSnapshot
  });

  assert.equal(correctedButtons.left, false);
  assert.equal(correctedButtons.right, true);
  assert.equal(correctedButtons.up, true);
  assert.equal(correctedButtons.down, false);
  assert.equal(correctedButtons.a, false);
  assert.equal(correctedButtons.b, true);
});

test("headless route-plan probe applies W1751 precontact right-fire in the default survival route", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 11940,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 128,
      playerY: 151,
      worldX: 1751,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 164, y: 158, vx: -2, vy: 0 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 102, y: 173, vx: 1, vy: 0 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 162, y: 196, vx: -1, vy: 0 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
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

test("headless route-plan probe can isolate W1755 extended descent right-fire carry", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const postPrecontactSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 145,
    worldX: 1755,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 155, y: 161, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 104, y: 176, vx: 1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const previousPrecontactButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1751-precontact-right-fire",
    frame: 11944,
    routeSegment,
    snapshot: postPrecontactSnapshot
  });

  assert.equal(previousPrecontactButtons.left, true, "the W1751-only correction ends at W1755 and lets close-body retreat resume");
  assert.equal(previousPrecontactButtons.right, false);

  const extendedPostPrecontactButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1755-descent-right-fire-carry",
    frame: 11944,
    routeSegment,
    snapshot: postPrecontactSnapshot
  });

  assert.equal(extendedPostPrecontactButtons.left, false);
  assert.equal(extendedPostPrecontactButtons.right, true);
  assert.equal(extendedPostPrecontactButtons.down, true);
  assert.equal(extendedPostPrecontactButtons.up, false);
  assert.equal(extendedPostPrecontactButtons.a, false);
  assert.equal(extendedPostPrecontactButtons.b, true);

  const lateDescentSnapshot = snapshot({
    jumpState: 81,
    playerX: 113,
    playerY: 173,
    worldX: 1740,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 113, y: 186, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 121, y: 196, vx: -1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const extendedLateButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1755-descent-right-fire-carry",
    frame: 11977,
    routeSegment,
    snapshot: lateDescentSnapshot
  });

  assert.equal(extendedLateButtons.left, false);
  assert.equal(extendedLateButtons.right, true);
  assert.equal(extendedLateButtons.down, true);
  assert.equal(extendedLateButtons.up, false);
  assert.equal(extendedLateButtons.a, false);
  assert.equal(extendedLateButtons.b, true);
});

test("headless route-plan probe applies W1755 descent right-fire in the default survival route", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 11944,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 128,
      playerY: 145,
      worldX: 1755,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 155, y: 161, vx: -2, vy: 0 },
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 104, y: 176, vx: 1, vy: 0 },
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

test("headless route-plan probe can isolate W1765 reentry right-fire carry", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const reentrySnapshot = snapshot({
    jumpState: 209,
    playerX: 104,
    playerY: 142,
    worldX: 1765,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 139, y: 150, vx: -2, vy: 0 },
      { fixed: false, hp: 0, kind: "object", routine: 0, threat: true, type: 0x05, x: 81, y: 165, vx: -1, vy: -1 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 68, y: 196, vx: 1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const previousDescentButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1755-descent-right-fire-carry",
    frame: 12386,
    routeSegment,
    snapshot: reentrySnapshot
  });

  assert.equal(previousDescentButtons.left, true, "the W1755-only correction still retreats left during the later W1765 reentry");
  assert.equal(previousDescentButtons.right, false);

  const reentryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1765-reentry-right-fire-carry",
    frame: 12386,
    routeSegment,
    snapshot: reentrySnapshot
  });

  assert.equal(reentryButtons.left, false);
  assert.equal(reentryButtons.right, true);
  assert.equal(reentryButtons.up, true);
  assert.equal(reentryButtons.down, false);
  assert.equal(reentryButtons.a, false);
  assert.equal(reentryButtons.b, true);
});

test("headless route-plan probe applies W1765 reentry right-fire in the default survival route", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12386,
    routeSegment,
    snapshot: snapshot({
      jumpState: 209,
      playerX: 104,
      playerY: 142,
      worldX: 1765,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 139, y: 150, vx: -2, vy: 0 },
        { fixed: false, hp: 0, kind: "object", routine: 0, threat: true, type: 0x05, x: 81, y: 165, vx: -1, vy: -1 },
        { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 68, y: 196, vx: 1, vy: 0 },
        { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
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

test("headless route-plan probe can isolate W1765 rear same-lane duck carry", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const rearContactSnapshot = snapshot({
    jumpState: 0,
    playerX: 104,
    playerY: 196,
    worldX: 1765,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 95, y: 196, vx: 1, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 110, y: 168, vx: -2, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const previousReentryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1765-reentry-right-fire-carry",
    frame: 12408,
    routeSegment,
    snapshot: rearContactSnapshot
  });

  assert.equal(previousReentryButtons.up, true, "the W1765 reentry carry keeps aiming upward at the same-lane rear contact");
  assert.equal(previousReentryButtons.down, false);
  assert.equal(previousReentryButtons.a, true);

  const rearContactButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1765-rear-contact-duck-carry",
    frame: 12408,
    routeSegment,
    snapshot: rearContactSnapshot
  });

  assert.equal(rearContactButtons.left, false);
  assert.equal(rearContactButtons.right, true);
  assert.equal(rearContactButtons.up, false);
  assert.equal(rearContactButtons.down, true);
  assert.equal(rearContactButtons.a, false);
  assert.equal(rearContactButtons.b, true);
});

test("headless route-plan probe can isolate W1765 grounded rear-contact micro duck", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const groundedRearContactSnapshot = snapshot({
    jumpState: 0,
    playerX: 104,
    playerY: 196,
    worldX: 1765,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 95, y: 196, vx: 1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });
  const airborneRearContactSnapshot = snapshot({
    ...groundedRearContactSnapshot,
    jumpState: 177,
    playerY: 186,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 92, y: 196, vx: 1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const previousReentryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1765-reentry-right-fire-carry",
    frame: 12408,
    routeSegment,
    snapshot: groundedRearContactSnapshot
  });

  assert.equal(previousReentryButtons.up, true);
  assert.equal(previousReentryButtons.a, true);

  const microDuckButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1765-grounded-rear-micro-duck",
    frame: 12408,
    routeSegment,
    snapshot: groundedRearContactSnapshot
  });

  assert.equal(microDuckButtons.left, false);
  assert.equal(microDuckButtons.right, true);
  assert.equal(microDuckButtons.up, false);
  assert.equal(microDuckButtons.down, true);
  assert.equal(microDuckButtons.a, false);
  assert.equal(microDuckButtons.b, true);

  const airborneButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1765-grounded-rear-micro-duck",
    frame: 12405,
    routeSegment,
    snapshot: airborneRearContactSnapshot
  });

  assert.equal(airborneButtons.up, true, "the micro duck must not flatten the airborne setup before landing");
  assert.equal(airborneButtons.down, false);
});

test("headless route-plan probe can isolate W1769 reentry right-carry extension", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const reentryExtensionSnapshot = snapshot({
    jumpState: 177,
    playerX: 108,
    playerY: 147,
    worldX: 1769,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 134, y: 153, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 162, y: 228, vx: 1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 },
      { fixed: true, hp: 8, kind: "durable", routine: 4, threat: true, type: 0x04, x: 148, y: 128 }
    ]
  });

  const previousReentryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1765-reentry-right-fire-carry",
    frame: 12390,
    routeSegment,
    snapshot: reentryExtensionSnapshot
  });

  assert.equal(previousReentryButtons.left, true, "the W1765 reentry candidate expires at W1769 and falls back to retreat");
  assert.equal(previousReentryButtons.right, false);

  const extendedReentryButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1769-reentry-right-extend",
    frame: 12390,
    routeSegment,
    snapshot: reentryExtensionSnapshot
  });

  assert.equal(extendedReentryButtons.left, false);
  assert.equal(extendedReentryButtons.right, true);
  assert.equal(extendedReentryButtons.up, true);
  assert.equal(extendedReentryButtons.down, false);
  assert.equal(extendedReentryButtons.a, false);
  assert.equal(extendedReentryButtons.b, true);
});

test("headless route-plan probe applies W1769 reentry extension in the default survival route", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const reentryExtensionSnapshot = snapshot({
    jumpState: 177,
    playerX: 108,
    playerY: 144,
    worldX: 1769,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 137, y: 152, vx: -2, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const defaultButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 12388,
    routeSegment,
    snapshot: reentryExtensionSnapshot
  });

  assert.equal(defaultButtons.left, false);
  assert.equal(defaultButtons.right, true);
  assert.equal(defaultButtons.up, true);
  assert.equal(defaultButtons.down, false);
  assert.equal(defaultButtons.a, false);
  assert.equal(defaultButtons.b, true);
});

test("headless route-plan probe keeps upper-air right carry near W1812 in the default survival route", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const upperAirFixedSnapshot = snapshot({
    jumpState: 209,
    playerX: 116,
    playerY: 138,
    worldX: 1812,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const defaultButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 12380,
    routeSegment,
    snapshot: upperAirFixedSnapshot
  });

  assert.equal(defaultButtons.left, false);
  assert.equal(defaultButtons.right, true);
  assert.equal(defaultButtons.up, true);
  assert.equal(defaultButtons.down, false);
  assert.equal(defaultButtons.a, false);
  assert.equal(defaultButtons.b, true);
});

test("headless route-plan probe keeps upper-air right carry near W1835 in the default survival route", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const upperAirFixedSnapshot = snapshot({
    jumpState: 177,
    playerX: 104,
    playerY: 144,
    worldX: 1824,
    enemies: [
      { fixed: true, hp: 8, kind: "durable", routine: 4, threat: true, type: 0x04, x: 120, y: 128 }
    ]
  });
  const sameLaneAirSnapshot = snapshot({
    jumpState: 81,
    playerX: 115,
    playerY: 151,
    worldX: 1835,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 120, y: 148, vx: -1, vy: 1 }
    ]
  });
  const lateUpperAirFixedSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 187,
    worldX: 1919,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const fixedButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 12742,
    routeSegment,
    snapshot: upperAirFixedSnapshot
  });

  assert.equal(fixedButtons.left, false);
  assert.equal(fixedButtons.right, true);
  assert.equal(fixedButtons.up, true);
  assert.equal(fixedButtons.down, false);
  assert.equal(fixedButtons.a, false);
  assert.equal(fixedButtons.b, true);

  const sameLaneButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 12778,
    routeSegment,
    snapshot: sameLaneAirSnapshot
  });

  assert.equal(sameLaneButtons.left, false);
  assert.equal(sameLaneButtons.right, true);
  assert.equal(sameLaneButtons.up, false);
  assert.equal(sameLaneButtons.down, false);
  assert.equal(sameLaneButtons.a, false);
  assert.equal(sameLaneButtons.b, true);

  const lateFixedButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 15315,
    routeSegment,
    snapshot: lateUpperAirFixedSnapshot
  });

  assert.equal(lateFixedButtons.left, false);
  assert.equal(lateFixedButtons.right, true);
  assert.equal(lateFixedButtons.up, true);
  assert.equal(lateFixedButtons.down, false);
  assert.equal(lateFixedButtons.a, false);
  assert.equal(lateFixedButtons.b, true);
});

test("headless route-plan probe applies lower-lane right clear after W1769 in the default survival route", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const landingContactSnapshot = snapshot({
    jumpState: 0,
    playerX: 104,
    playerY: 196,
    worldX: 1765,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 95, y: 196, vx: 1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });
  const leftRegressionSnapshot = snapshot({
    jumpState: 0,
    playerX: 25,
    playerY: 212,
    worldX: 1686,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 44, y: 206, vx: -2, vy: 0 }
    ]
  });
  const forwardOverheadSnapshot = snapshot({
    jumpState: 0,
    playerX: 62,
    playerY: 212,
    worldX: 1728,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 92, y: 175, vx: -2, vy: 0 }
    ]
  });
  const closeOverheadSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 1811,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 131, y: 172, vx: -1, vy: 1 }
    ]
  });
  const spawnPreclearSnapshot = snapshot({
    jumpState: 0,
    playerX: 121,
    playerY: 196,
    worldX: 1787,
    enemies: [
      { fixed: false, hp: 0, kind: "object", routine: 0, threat: true, type: 0x05, x: 129, y: 165, vx: 0, vy: -1 }
    ]
  });

  for (const routeSnapshot of [landingContactSnapshot, leftRegressionSnapshot]) {
    const buttons = decideHeadlessRoutePlanProbeButtons({
      frame: 12408,
      routeSegment,
      snapshot: routeSnapshot
    });

    assert.equal(buttons.left, false);
    assert.equal(buttons.right, true);
    assert.equal(buttons.up, false);
    assert.equal(buttons.down, true);
    assert.equal(buttons.a, false);
    assert.equal(buttons.b, true);
  }

  for (const routeSnapshot of [forwardOverheadSnapshot, closeOverheadSnapshot, spawnPreclearSnapshot]) {
    const buttons = decideHeadlessRoutePlanProbeButtons({
      frame: 12346,
      routeSegment,
      snapshot: routeSnapshot
    });

    assert.equal(buttons.left, false);
    assert.equal(buttons.right, true);
    assert.equal(buttons.up, true);
    assert.equal(buttons.down, false);
    assert.equal(buttons.a, false);
    assert.equal(buttons.b, true);
  }
});

test("headless route-plan probe left-jump brakes through the W1943 low-lane fall window", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const lowEdgeSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 231,
    worldX: 1942,
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 163, y: 232, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 14381,
    routeSegment,
    snapshot: lowEdgeSnapshot
  });

  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.up, false);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right carry through the W1941 pit-entry descent", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const pitEntryAirSnapshot = snapshot({
    jumpState: 34,
    playerX: 108,
    playerY: 152,
    worldX: 1941,
    enemies: []
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 13032,
    routeSegment,
    snapshot: pitEntryAirSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe ignores W1925 rear fixed-body overlap during pit entry", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const pitEntryFixedOverlapSnapshot = snapshot({
    jumpState: 82,
    playerX: 128,
    playerY: 141,
    worldX: 1925,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12663,
    routeSegment,
    snapshot: pitEntryFixedOverlapSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe suppresses the early W1946 pit-entry jump", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048,
    jumpEvery: 72
  };
  const earlyGroundedPitSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 164,
    worldX: 1946,
    enemies: []
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12676,
    routeSegment,
    snapshot: earlyGroundedPitSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe commits the delayed W1961 pit-entry jump", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048,
    jumpEvery: 72
  };
  const delayedGroundedPitSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 164,
    worldX: 1961,
    enemies: []
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12690,
    routeSegment,
    snapshot: delayedGroundedPitSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right carry through the W2006 pit fall window", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const pitAirSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 183,
    worldX: 1996,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 76, y: 160, vx: -1, vy: 1 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 13100,
    routeSegment,
    snapshot: pitAirSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right carry through W2001 high pit fixed overlap", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const highPitFixedOverlapSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 117,
    worldX: 2001,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12732,
    routeSegment,
    snapshot: highPitFixedOverlapSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right carry through W2011 low pit exit", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const lowPitExitSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 231,
    worldX: 2011,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12762,
    routeSegment,
    snapshot: lowPitExitSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right after landing on the W2018 pit-exit platform", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const pitExitPlatformSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 164,
    worldX: 2018,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12749,
    routeSegment,
    snapshot: pitExitPlatformSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe jumps from the W2028 pit-exit platform edge", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const pitExitEdgeSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 164,
    worldX: 2028,
    enemies: []
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12759,
    routeSegment,
    snapshot: pitExitEdgeSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right through W2150 weapon-gate high fixed overlap", () => {
  const routeSegment = {
    id: "weapon-gate-survive",
    action: "loot",
    fire: "always",
    worldStart: 2048,
    worldEnd: 2366
  };
  const highWeaponGateSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 91,
    worldX: 2150,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 12958,
    routeSegment,
    snapshot: highWeaponGateSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right through the Contra Japan W2160 high-air body contact", () => {
  const routeSegment = {
    id: "weapon-gate-survive",
    action: "loot",
    fire: "always",
    worldStart: 2048,
    worldEnd: 2366
  };
  const highAirContactSnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 20,
    worldX: 2160,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 133, y: 48, vx: -2, vy: -1 },
      { fixed: true, hp: 8, kind: "durable", routine: 4, threat: true, type: 0x07, x: 159, y: 64 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 7340,
    routeSegment,
    snapshot: highAirContactSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe keeps right-jump through W2162 weapon-gate low object", () => {
  const routeSegment = {
    id: "weapon-gate-survive",
    action: "loot",
    fire: "always",
    worldStart: 2048,
    worldEnd: 2366
  };
  const lowWeaponGateSnapshot = snapshot({
    jumpState: 81,
    playerX: 127,
    playerY: 209,
    worldX: 2162,
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 138, y: 232, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 13004,
    routeSegment,
    snapshot: lowWeaponGateSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe jumps at the Contra Japan W2480 boss-approach mid-platform edge", () => {
  const routeSegment = {
    id: "boss-approach-survive",
    action: "survive",
    fire: "always",
    worldStart: 2366,
    worldEnd: 2960
  };
  const midPlatformEdgeSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 182,
    worldX: 2480,
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 109, y: 217, vx: -1, vy: 0 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 106, y: 232, vx: -1, vy: 3 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 7663,
    routeSegment,
    snapshot: midPlatformEdgeSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe uses the Contra Japan 14-frame mid-platform pulse", () => {
  const routeSegment = {
    id: "boss-approach-survive",
    action: "survive",
    fire: "always",
    worldStart: 2366,
    worldEnd: 2960
  };
  const preEdgeSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 196,
    worldX: 2516,
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 109, y: 217, vx: -1, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 7700,
    routeSegment,
    snapshot: preEdgeSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe repeats jump through the Contra Japan W2564 mid-platform chain", () => {
  const routeSegment = {
    id: "boss-approach-survive",
    action: "survive",
    fire: "always",
    worldStart: 2366,
    worldEnd: 2960
  };
  const chainLandingSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 148,
    worldX: 2557,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x03, x: 75, y: 156, vx: 1, vy: 2 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 109, y: 217, vx: -1, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 7742,
    routeSegment,
    snapshot: chainLandingSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe jumps at the Contra Japan W2838 late boss-approach edge", () => {
  const routeSegment = {
    id: "boss-approach-survive",
    action: "survive",
    fire: "always",
    worldStart: 2366,
    worldEnd: 2960
  };
  const lateEdgeSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 230,
    worldX: 2838,
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 109, y: 217, vx: -1, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 8140,
    routeSegment,
    snapshot: lateEdgeSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe jumps through the Contra Japan W2939 boss-entry approach", () => {
  const routeSegment = {
    id: "boss-approach-survive",
    action: "survive",
    fire: "always",
    worldStart: 2366,
    worldEnd: 2960
  };
  const bossEntrySnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 216,
    worldX: 2939,
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 109, y: 217, vx: -1, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 8242,
    routeSegment,
    snapshot: bossEntrySnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can isolate W2331 weapon-gate air preclear up-fire", () => {
  const routeSegment = {
    id: "weapon-gate-survive",
    action: "loot",
    fire: "always",
    worldStart: 2048,
    worldEnd: 2366
  };
  const incomingAirBodySnapshot = snapshot({
    jumpState: 49,
    playerX: 128,
    playerY: 56,
    worldX: 2331,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 146, y: 103, vx: -1, vy: -2 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w2331-air-preclear-up-fire",
    frame: 13142,
    routeSegment,
    snapshot: incomingAirBodySnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can isolate W2287 weapon-gate jump suppression", () => {
  const routeSegment = {
    id: "weapon-gate-survive",
    action: "loot",
    fire: "always",
    worldStart: 2048,
    worldEnd: 2366
  };
  const fixedTargetJumpTrapSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 100,
    worldX: 2287,
    enemies: [
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w2287-weapon-gate-jump-suppress",
    frame: 13097,
    routeSegment,
    snapshot: fixedTargetJumpTrapSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("late candidate trials inherit promoted default survival route corrections", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const reentryBodySnapshot = snapshot({
    jumpState: 177,
    playerX: 108,
    playerY: 144,
    worldX: 1765,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 136, y: 156, vx: -1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w2331-air-preclear-up-fire",
    frame: 12408,
    routeSegment,
    snapshot: reentryBodySnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("data-driven overlay candidates inherit defaults when their guard does not match", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const reentryBodySnapshot = snapshot({
    jumpState: 177,
    playerX: 108,
    playerY: 144,
    worldX: 1765,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 136, y: 156, vx: -1, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateOverlay: {
      id: "late-window-neutral-fire",
      action: "neutral_fire",
      guard: {
        airborne: true,
        worldX: [2328, 2360]
      }
    },
    candidateTrial: "late-window-neutral-fire",
    frame: 12408,
    routeSegment,
    snapshot: reentryBodySnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can isolate W1686 left-edge close-body right guard", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const leftEdgeCloseBodySnapshot = snapshot({
    jumpState: 0,
    playerX: 25,
    playerY: 212,
    worldX: 1686,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 33, y: 212, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 19, y: 232, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 46, y: 132, vx: -1, vy: 0 }
    ]
  });

  const defaultButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 12876,
    routeSegment,
    snapshot: leftEdgeCloseBodySnapshot
  });

  assert.equal(defaultButtons.left, false, "the default lower-lane clear no longer retreats left into the stage edge");
  assert.equal(defaultButtons.right, true);
  assert.equal(defaultButtons.down, true);
  assert.equal(defaultButtons.a, false);
  assert.equal(defaultButtons.b, true);

  const guardedButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1686-left-edge-close-body-right-guard",
    frame: 12876,
    routeSegment,
    snapshot: leftEdgeCloseBodySnapshot
  });

  assert.equal(guardedButtons.left, false);
  assert.equal(guardedButtons.right, true);
  assert.equal(guardedButtons.up, true);
  assert.equal(guardedButtons.down, false);
  assert.equal(guardedButtons.a, true);
  assert.equal(guardedButtons.b, true);
});

test("headless route-plan probe can isolate W1686 left-edge overhead duck guard", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const overheadContactSnapshot = snapshot({
    jumpState: 0,
    playerX: 44,
    playerY: 212,
    worldX: 1705,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 55, y: 187, vx: -1, vy: 0 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 19, y: 232, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 139, y: 196, vx: 1, vy: 0 }
    ]
  });

  const rightGuardButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1686-left-edge-close-body-right-guard",
    frame: 12744,
    routeSegment,
    snapshot: overheadContactSnapshot
  });

  assert.equal(rightGuardButtons.right, true, "the first W1686 guard still runs into the overhead soldier");
  assert.equal(rightGuardButtons.up, true);

  const duckGuardButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1686-left-edge-overhead-duck-guard",
    frame: 12744,
    routeSegment,
    snapshot: overheadContactSnapshot
  });

  assert.equal(duckGuardButtons.left, false);
  assert.equal(duckGuardButtons.right, false);
  assert.equal(duckGuardButtons.up, false);
  assert.equal(duckGuardButtons.down, true);
  assert.equal(duckGuardButtons.a, false);
  assert.equal(duckGuardButtons.b, true);
});

test("headless route-plan probe can isolate W1686 left-edge duck hold guard", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const sameLaneSettledSnapshot = snapshot({
    jumpState: 0,
    playerX: 39,
    playerY: 212,
    worldX: 1700,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 11, threat: true, type: 0x05, x: 49, y: 217, vx: -1, vy: 0 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x01, x: 19, y: 232, vx: -2, vy: 0 },
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 0x05, x: 7, y: 132, vx: -1, vy: 0 }
    ]
  });

  const overheadDuckButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1686-left-edge-overhead-duck-guard",
    frame: 12769,
    routeSegment,
    snapshot: sameLaneSettledSnapshot
  });

  assert.equal(overheadDuckButtons.right, true, "the overhead-only duck guard releases too early once the enemy settles same-lane");
  assert.equal(overheadDuckButtons.up, true);

  const duckHoldButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1686-left-edge-duck-hold-guard",
    frame: 12769,
    routeSegment,
    snapshot: sameLaneSettledSnapshot
  });

  assert.equal(duckHoldButtons.left, false);
  assert.equal(duckHoldButtons.right, false);
  assert.equal(duckHoldButtons.up, false);
  assert.equal(duckHoldButtons.down, true);
  assert.equal(duckHoldButtons.a, false);
  assert.equal(duckHoldButtons.b, true);
});

test("headless route-plan probe can isolate W1721 airborne upper preclear right fire", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const airborneUpperThreatSnapshot = snapshot({
    jumpState: 209,
    playerX: 60,
    playerY: 160,
    worldX: 1721,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 70, y: 132, vx: -1, vy: 0 },
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 131, y: 128, vx: -2, vy: 0 },
      { fixed: true, hp: 240, kind: "durable", routine: 0, threat: true, type: 0x02, x: 136, y: 128 }
    ]
  });

  const defaultButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 12660,
    routeSegment,
    snapshot: airborneUpperThreatSnapshot
  });

  assert.equal(defaultButtons.left, true, "the default close-body rule retreats left in the airborne upper-preclear window");
  assert.equal(defaultButtons.right, false);

  const preclearButtons = decideHeadlessRoutePlanProbeButtons({
    candidateTrial: "w1721-airborne-upper-preclear-right-fire",
    frame: 12660,
    routeSegment,
    snapshot: airborneUpperThreatSnapshot
  });

  assert.equal(preclearButtons.left, false);
  assert.equal(preclearButtons.right, true);
  assert.equal(preclearButtons.up, true);
  assert.equal(preclearButtons.down, false);
  assert.equal(preclearButtons.a, false);
  assert.equal(preclearButtons.b, true);
});

test("headless route-plan probe applies a data-driven candidate overlay before hardcoded trials", () => {
  const routeSegment = {
    id: "danger-survive",
    action: "survive",
    fire: "always",
    worldStart: 1550,
    worldEnd: 2048
  };
  const airborneThreatSnapshot = snapshot({
    jumpState: 209,
    playerX: 60,
    playerY: 160,
    worldX: 1765,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 0x05, x: 70, y: 150, vx: -1, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateOverlay: {
      id: "matrix-w1765-right-up-fire",
      action: "right_up_fire",
      guard: {
        airborne: true,
        enemy: {
          dx: [-12, 18],
          dy: [-24, 12],
          fixed: false,
          hpMin: 1,
          kind: "enemy"
        },
        playerX: [40, 80],
        playerY: [140, 180],
        worldX: [1758, 1784]
      }
    },
    frame: 12660,
    routeSegment,
    snapshot: airborneThreatSnapshot
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.up, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe can force an overlay before boss-wall micro for training search", () => {
  const routeSegment = {
    id: "boss-wall-survive",
    action: "survive",
    fire: "always",
    worldStart: 2960,
    worldEnd: 3300
  };
  const bossWallUpperStationSnapshot = snapshot({
    jumpState: 49,
    playerX: 136,
    playerY: 153,
    worldX: 3208,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 135, y: 130, vx: -1, vy: 0 },
      { fixed: true, hp: 5, kind: "durable", routine: 2, threat: true, type: 0x10, x: 153, y: 128, vx: 0, vy: 0 }
    ]
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateOverlay: {
      id: "training-left-up-preclear",
      action: "left_up_fire",
      guard: {
        airborne: true,
        playerX: [134, 140],
        playerY: [146, 156],
        worldX: [3208, 3212],
        enemy: {
          fixed: false,
          hpMin: 1,
          threat: true,
          type: 0x01,
          dx: [-8, 0],
          dy: [-28, -10]
        }
      }
    },
    forceCandidateOverlay: true,
    frame: 8407,
    routeSegment,
    snapshot: bossWallUpperStationSnapshot
  });

  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.up, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe applies the first matching overlay from a multi-step candidate", () => {
  const routeSegment = {
    id: "boss-approach-survive",
    action: "cautious",
    fire: "always",
    worldStart: 2366,
    worldEnd: 2960
  };
  const lowEdgeSnapshot = snapshot({
    jumpState: 0,
    playerX: 128,
    playerY: 220,
    worldX: 2388,
    enemies: []
  });

  const buttons = decideHeadlessRoutePlanProbeButtons({
    candidateOverlay: [
      {
        id: "w2280-2360-right-fire",
        action: "right_fire",
        guard: {
          playerX: [96, 132],
          playerY: [36, 120],
          worldX: [2280, 2360]
        }
      },
      {
        id: "w2380-2392-left-jump-fire",
        action: "left_jump_fire",
        guard: {
          grounded: true,
          playerX: [120, 132],
          playerY: [200, 236],
          worldX: [2380, 2392]
        }
      }
    ],
    frame: 15000,
    routeSegment,
    snapshot: lowEdgeSnapshot
  });

  assert.equal(buttons.left, true);
  assert.equal(buttons.right, false);
  assert.equal(buttons.a, true);
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

test("headless route-plan probe promotes Contra Japan W1730 upper-air carry", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 6302,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 1550,
      worldEnd: 2048
    },
    snapshot: snapshot({
      jumpState: 177,
      playerX: 128,
      playerY: 101,
      worldX: 1769,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 138, y: 128 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.up, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe promotes Contra Japan W2068 platform jump", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 7000,
    routeSegment: {
      id: "danger-survive",
      action: "survive",
      fire: "always",
      worldStart: 2048,
      worldEnd: 2438
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 132,
      worldX: 2078
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, true);
  assert.equal(buttons.down, false);
  assert.equal(buttons.a, true);
  assert.equal(buttons.b, true);
});

test("headless route-plan probe holds Contra Japan W2782 boss-approach jump through the platform chain", () => {
  const routeSegment = {
    id: "boss-approach-survive",
    action: "survive",
    fire: "always",
    worldStart: 2438,
    worldEnd: 2960
  };
  const airCarryButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 7443,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 128,
      playerY: 116,
      worldX: 2758
    })
  });

  assert.equal(airCarryButtons.left, false);
  assert.equal(airCarryButtons.right, true);
  assert.equal(airCarryButtons.down, false);
  assert.equal(airCarryButtons.a, false);
  assert.equal(airCarryButtons.b, true);

  const groundRunButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 7458,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 132,
      worldX: 2774
    })
  });

  assert.equal(groundRunButtons.left, false);
  assert.equal(groundRunButtons.right, true);
  assert.equal(groundRunButtons.down, false);
  assert.equal(groundRunButtons.a, false);
  assert.equal(groundRunButtons.b, true);

  const heldJumpButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 7467,
    routeSegment,
    snapshot: snapshot({
      jumpState: 0,
      playerX: 128,
      playerY: 132,
      worldX: 2782
    })
  });

  assert.equal(heldJumpButtons.left, false);
  assert.equal(heldJumpButtons.right, true);
  assert.equal(heldJumpButtons.down, false);
  assert.equal(heldJumpButtons.a, true);
  assert.equal(heldJumpButtons.b, true);

  const lateAirCarryButtons = decideHeadlessRoutePlanProbeButtons({
    frame: 7510,
    routeSegment,
    snapshot: snapshot({
      jumpState: 49,
      playerX: 128,
      playerY: 93,
      worldX: 2820
    })
  });

  assert.equal(lateAirCarryButtons.left, false);
  assert.equal(lateAirCarryButtons.right, true);
  assert.equal(lateAirCarryButtons.down, false);
  assert.equal(lateAirCarryButtons.a, false);
  assert.equal(lateAirCarryButtons.b, true);
});

test("headless route-plan probe uses Contra Japan boss-entry duck fire before the core wall", () => {
  const buttons = decideHeadlessRoutePlanProbeButtons({
    frame: 7870,
    routeSegment: {
      id: "boss-wall-survive",
      action: "hold-fire",
      fire: "always",
      worldStart: 2960,
      worldEnd: 9999
    },
    snapshot: snapshot({
      jumpState: 0,
      playerX: 127,
      playerY: 132,
      worldX: 3164,
      enemies: [
        { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 0x01, x: 135, y: 144 },
        { fixed: true, hp: 16, kind: "durable", routine: 2, threat: true, type: 0x10, x: 177, y: 128 }
      ]
    })
  });

  assert.equal(buttons.left, false);
  assert.equal(buttons.right, false);
  assert.equal(buttons.down, true);
  assert.equal(buttons.up, false);
  assert.equal(buttons.a, false);
  assert.equal(buttons.b, true);
});
