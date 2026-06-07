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
  findMidWeaponTurretStallTarget,
  findRewardStationFallingThreat,
  midWeaponTurretBreakoutPatch,
  rewardStationFallingThreatPatch,
  stageOneBossApproachCloseBodyPatch,
  stageOneBossApproachHighAirCarryPatch,
  stageOneBossApproachHighEdgeJumpPatch,
  stageOneBossApproachJumpEdgePatch,
  stageOneBossApproachMidPlatformCapturePatch,
  stageOneBossApproachPlatformJumpPatch,
  stageOneCloseBodyThreatPatch,
  stageOneMandatorySpreadGatePatch,
  stageOneRedTurretLowThreatPatch,
  stageOneSpreadExitJumpPatch,
  stageOneSpreadJumpEdgePatch,
  stageOneSpreadRushPatch,
  stageOneSpreadTurretSuppressionPatch,
  midFixedScriptRewardOverride
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/contraStage1RewardTactics.ts", import.meta.url));

test("mid fixed script prioritizes a close stage reward target", () => {
  const target = midFixedScriptRewardOverride({
    rewardAhead: { category: "reward", distance: 18, aim: "up" }
  });

  assert.equal(target?.aim, "up");
});

test("mid fixed script preloads a medium-range reward target", () => {
  const target = midFixedScriptRewardOverride({
    rewardAhead: { category: "reward", distance: 160, aim: "up" }
  });

  assert.equal(target?.aim, "up");
});

test("mid fixed script ignores very far reward targets", () => {
  const target = midFixedScriptRewardOverride({
    rewardAhead: { category: "reward", distance: 240, aim: "up" }
  });

  assert.equal(target, null);
});

test("reward station detects the falling soldier that killed the AI", () => {
  const threat = findRewardStationFallingThreat({
    level: 0,
    worldX: 1132,
    playerX: 119,
    playerY: 212,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 5, x: 125, y: 191 },
      { fixed: true, hp: 8, kind: "durable", routine: 4, threat: true, type: 4, x: 170, y: 160 }
    ]
  });

  assert.equal(threat?.type, 5);
  assert.equal(threat?.x, 125);
});

test("reward station ignores distant background soldiers", () => {
  const threat = findRewardStationFallingThreat({
    level: 0,
    worldX: 1132,
    playerX: 119,
    playerY: 212,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 5, x: 205, y: 100 }
    ]
  });

  assert.equal(threat, null);
});

test("mid weapon turret stall target detects close weapon box with turret ahead", () => {
  const target = findMidWeaponTurretStallTarget({
    level: 0,
    playerY: 212,
    weapon: 0,
    worldX: 1321,
    horizon: {
      fixedAhead: { category: "fixed", distance: 87, aim: "down" },
      rewardAhead: { category: "reward", distance: 23, aim: "down" }
    }
  });

  assert.equal(target?.kind, "weapon-turret-stall");
});

test("mid weapon turret stall target ignores non-stage windows", () => {
  const target = findMidWeaponTurretStallTarget({
    level: 0,
    playerY: 212,
    weapon: 0,
    worldX: 1510,
    horizon: {
      fixedAhead: { category: "fixed", distance: 20, aim: "down" },
      rewardAhead: { category: "reward", distance: 8, aim: "down" }
    }
  });

  assert.equal(target, null);
});

test("reward station falling threat patch jumps and up-fires", () => {
  const patch = rewardStationFallingThreatPatch({
    level: 0,
    worldX: 1132,
    playerX: 119,
    playerY: 212,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 5, x: 125, y: 191 }
    ]
  }, true, 30);

  assert.equal(patch?.reason, "reward-station-falling-threat");
  assert.equal(patch?.a, true);
  assert.equal(patch?.b, true);
  assert.equal(patch?.up, true);
  assert.equal(patch?.down, false);
});

test("mid weapon turret breakout patch clears crouch lock and advances", () => {
  const patch = midWeaponTurretBreakoutPatch({
    level: 0,
    playerY: 212,
    weapon: 0,
    worldX: 1321,
    horizon: {
      fixedAhead: { category: "fixed", distance: 87, aim: "down" },
      rewardAhead: { category: "reward", distance: 23, aim: "down" }
    }
  }, true, 8);

  assert.equal(patch?.reason, "mid-weapon-turret-breakout");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.down, false);
  assert.equal(patch?.a, true);
});

test("mid weapon turret breakout stays active after the weapon box is barely missed", () => {
  const patch = midWeaponTurretBreakoutPatch({
    level: 0,
    playerY: 212,
    weapon: 0,
    worldX: 1353,
    horizon: {
      fixedAhead: { category: "fixed", distance: 55, aim: "auto" },
      rewardAhead: { category: "reward", distance: -9, aim: "down" }
    }
  }, true, 2319);

  assert.equal(patch?.reason, "mid-weapon-turret-breakout");
  assert.equal(patch?.right, true);
  assert.equal(patch?.down, false);
  assert.equal(patch?.a, true);
});

test("stage one close body threat patch air-strafes away from same-lane soldier", () => {
  const patch = stageOneCloseBodyThreatPatch({
    level: 0,
    worldX: 1990,
    playerX: 128,
    playerY: 136,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 5, x: 129, y: 131 },
      { fixed: true, hp: 8, kind: "durable", routine: 4, threat: true, type: 7, x: 201, y: 160 }
    ]
  }, false, 3811);

  assert.equal(patch?.reason, "stage-one-close-body-threat");
  assert.equal(patch?.left, true);
  assert.equal(patch?.right, false);
  assert.equal(patch?.down, false);
  assert.equal(patch?.up, true);
  assert.equal(patch?.b, true);
});

test("stage one close body threat keeps right during spread pit airborne crossing", () => {
  const patch = stageOneCloseBodyThreatPatch({
    level: 0,
    worldX: 2018,
    playerX: 127,
    playerY: 115,
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: true, type: 1, x: 130, y: 135 }
    ]
  }, false, 3929);

  assert.equal(patch?.reason, "stage-one-close-body-threat");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.down, true);
  assert.equal(patch?.up, false);
  assert.equal(patch?.b, true);
});

test("stage one close body threat covers the boss approach airborne soldier", () => {
  const patch = stageOneCloseBodyThreatPatch({
    level: 0,
    worldX: 2179,
    playerX: 128,
    playerY: 112,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 2, threat: true, type: 5, x: 130, y: 132 }
    ]
  }, false, 4113);

  assert.equal(patch?.reason, "stage-one-close-body-threat");
  assert.equal(patch?.left, true);
  assert.equal(patch?.right, false);
  assert.equal(patch?.down, true);
  assert.equal(patch?.up, false);
  assert.equal(patch?.b, true);
});

test("stage one red turret entry handles low close soldier with down-fire advance", () => {
  const patch = stageOneRedTurretLowThreatPatch({
    level: 0,
    worldX: 1802,
    playerX: 88,
    playerY: 177,
    horizon: {
      fixedAhead: { category: "fixed", distance: 22, aim: "auto" },
      rewardAhead: null
    },
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 5, x: 89, y: 196 },
      { fixed: true, hp: 2, kind: "durable", routine: 4, threat: true, type: 4, x: 126, y: 128 }
    ]
  }, false, 3775);

  assert.equal(patch?.reason, "stage-one-red-turret-low-threat");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.down, true);
  assert.equal(patch?.up, false);
  assert.equal(patch?.b, true);
});

test("stage one spread rush prevents left retreat near spread weapon box", () => {
  const patch = stageOneSpreadRushPatch({
    level: 0,
    worldX: 1998,
    playerX: 123,
    playerY: 125,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: 50, aim: "down" }
    },
    enemies: [
      { fixed: true, hp: 5, kind: "durable", routine: 4, threat: true, type: 7, x: 168, y: 160 }
    ]
  }, false, 3939);

  assert.equal(patch?.reason, "stage-one-spread-rush");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.down, true);
  assert.equal(patch?.up, false);
  assert.equal(patch?.b, true);
});

test("stage one spread exit jump restores pit rhythm after reward rush", () => {
  const patch = stageOneSpreadExitJumpPatch({
    level: 0,
    worldX: 2018,
    playerX: 128,
    playerY: 164,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: 30, aim: "down" }
    },
    enemies: [
      { fixed: true, hp: 6, kind: "durable", routine: 4, threat: true, type: 7, x: 94, y: 160 }
    ]
  }, true, 4009);

  assert.equal(patch?.reason, "stage-one-spread-exit-jump");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.a, true);
  assert.equal(patch?.down, false);
});

test("stage one spread jump edge releases A before the late pit takeoff", () => {
  const patch = stageOneSpreadJumpEdgePatch({
    level: 0,
    worldX: 1966,
    playerX: 134,
    playerY: 164,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: null
    },
    enemies: []
  }, true, 3970);

  assert.equal(patch?.reason, "stage-one-spread-jump-edge");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.a, false);
  assert.equal(patch?.b, true);
  assert.equal(patch?.down, false);
});

test("stage one spread jump edge ends quickly so the second jump starts early", () => {
  const patch = stageOneSpreadJumpEdgePatch({
    level: 0,
    worldX: 1970,
    playerX: 134,
    playerY: 164,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: null
    },
    enemies: []
  }, true, 3970);

  assert.equal(patch, null);
});

test("stage one boss approach jump edge releases A before the third pit takeoff", () => {
  const patch = stageOneBossApproachJumpEdgePatch({
    level: 0,
    worldX: 2062,
    playerX: 128,
    playerY: 151,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: null
    },
    enemies: []
  }, true, 3994);

  assert.equal(patch?.reason, "stage-one-boss-approach-jump-edge");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.a, false);
  assert.equal(patch?.down, false);
});

test("stage one boss approach jump edge can release A while falling before landing", () => {
  const patch = stageOneBossApproachJumpEdgePatch({
    level: 0,
    worldX: 2062,
    playerX: 128,
    playerY: 151,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: null
    },
    enemies: []
  }, false, 3994);

  assert.equal(patch?.reason, "stage-one-boss-approach-jump-edge");
  assert.equal(patch?.a, false);
  assert.equal(patch?.right, true);
});

test("stage one boss approach jump edge ends before the third takeoff point", () => {
  const patch = stageOneBossApproachJumpEdgePatch({
    level: 0,
    worldX: 2066,
    playerX: 128,
    playerY: 164,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: null
    },
    enemies: []
  }, true, 3998);

  assert.equal(patch, null);
});

test("stage one boss approach close body clears the WorldX 2809 lower soldier without jump lock", () => {
  const patch = stageOneBossApproachCloseBodyPatch({
    level: 0,
    worldX: 2809,
    playerX: 128,
    playerY: 176,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 3, threat: true, type: 5, x: 136, y: 188 },
      { fixed: true, hp: 1, kind: "object", routine: 0, threat: true, type: 5, x: 251, y: 164 }
    ]
  }, 5144);

  assert.equal(patch?.reason, "stage-one-boss-approach-close-body");
  assert.equal(patch?.a, false);
  assert.equal(patch?.b, true);
  assert.equal(patch?.down, true);
  assert.equal(patch?.up, false);
  assert.equal(patch?.left, false);
  assert.equal(patch?.right, false);
});

test("stage one boss approach high edge jump does not start the disproved center-lane high carry", () => {
  const patch = stageOneBossApproachHighEdgeJumpPatch({
    level: 0,
    worldX: 2778,
    playerX: 128,
    playerY: 132,
    enemies: []
  }, true, 5117);

  assert.equal(patch, null);
});

test("stage one boss approach high air carry does not extend the disproved center-lane high arc", () => {
  const patch = stageOneBossApproachHighAirCarryPatch({
    level: 0,
    worldX: 2839,
    playerX: 128,
    playerY: 151,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 6, threat: true, type: 5, x: 166, y: 133 }
    ]
  }, false, 5179);

  assert.equal(patch, null);
});

test("stage one boss approach mid platform capture overrides right carry only after a visible overrun", () => {
  const patch = stageOneBossApproachMidPlatformCapturePatch({
    level: 0,
    worldX: 2844,
    playerX: 144,
    playerY: 176,
    enemies: [
      { fixed: false, hp: 0, kind: "enemy", routine: 2, threat: true, type: 5, x: 152, y: 154 }
    ]
  }, false, 5184);

  assert.equal(patch?.reason, "stage-one-boss-approach-mid-platform-capture");
  assert.equal(patch?.a, false);
  assert.equal(patch?.b, true);
  assert.equal(patch?.left, true);
  assert.equal(patch?.right, false);
  assert.equal(patch?.up, false);
});

test("stage one boss approach mid platform capture does not pull left from the center landing lane", () => {
  const patch = stageOneBossApproachMidPlatformCapturePatch({
    level: 0,
    worldX: 2842,
    playerX: 128,
    playerY: 171,
    enemies: [
      { fixed: false, hp: 0, kind: "enemy", routine: 6, threat: true, type: 5, x: 154, y: 157 }
    ]
  }, false, 5183);

  assert.equal(patch, null);
});

test("stage one boss approach mid platform capture does not pull left at the early landing commit point", () => {
  const patch = stageOneBossApproachMidPlatformCapturePatch({
    level: 0,
    worldX: 2836,
    playerX: 124,
    playerY: 176,
    enemies: [
      { fixed: false, hp: 0, kind: "enemy", routine: 2, threat: true, type: 5, x: 155, y: 164 }
    ]
  }, false, 5184);

  assert.equal(patch, null);
});

test("stage one boss approach mid platform capture is a different route class, not another high-edge takeoff", () => {
  const patch = stageOneBossApproachMidPlatformCapturePatch({
    level: 0,
    worldX: 2778,
    playerX: 128,
    playerY: 132,
    enemies: []
  }, true, 5117);

  assert.equal(patch, null);
});

test("stage one boss approach platform jump does not hold A during the pre-landing fall", () => {
  const patch = stageOneBossApproachPlatformJumpPatch({
    level: 0,
    worldX: 2800,
    playerX: 128,
    playerY: 150,
    enemies: []
  }, true, 5139);

  assert.equal(patch, null);
});

test("stage one boss approach platform jump releases A before the lower platform contact", () => {
  const patch = stageOneBossApproachPlatformJumpPatch({
    level: 0,
    worldX: 2792,
    playerX: 128,
    playerY: 136,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 6, threat: true, type: 5, x: 235, y: 164 }
    ]
  }, true, 5131);

  assert.equal(patch, null);
});

test("stage one boss approach platform jump edge-triggers on the lower platform contact", () => {
  const patch = stageOneBossApproachPlatformJumpPatch({
    level: 0,
    worldX: 2814,
    playerX: 128,
    playerY: 196,
    enemies: [
      { fixed: false, hp: 1, kind: "enemy", routine: 6, threat: true, type: 5, x: 216, y: 164 }
    ]
  }, true, 5154);

  assert.equal(patch?.reason, "stage-one-boss-approach-platform-jump");
  assert.equal(patch?.a, true);
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.down, false);
});

test("stage one boss approach platform jump exits after the no-loop window", () => {
  const patch = stageOneBossApproachPlatformJumpPatch({
    level: 0,
    worldX: 2832,
    playerX: 128,
    playerY: 215,
    enemies: []
  }, true, 5172);

  assert.equal(patch, null);
});

test("stage one spread turret suppression does not pull left during airborne pit crossing", () => {
  const patch = stageOneSpreadTurretSuppressionPatch({
    level: 0,
    worldX: 2018,
    playerX: 127,
    playerY: 115,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: 30, aim: "down" }
    },
    enemies: [
      { fixed: true, hp: 3, kind: "durable", routine: 4, threat: true, type: 7, x: 172, y: 160 }
    ]
  }, false, 3929);

  assert.equal(patch, null);
});

test("stage one spread turret suppression keeps right when the turret is close during airborne pit crossing", () => {
  const patch = stageOneSpreadTurretSuppressionPatch({
    level: 0,
    worldX: 2020,
    playerX: 127,
    playerY: 119,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: 28, aim: "down" }
    },
    enemies: [
      { fixed: true, hp: 3, kind: "durable", routine: 4, threat: true, type: 7, x: 170, y: 160 }
    ]
  }, false, 3931);

  assert.equal(patch?.reason, "stage-one-spread-turret-suppression");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.down, true);
  assert.equal(patch?.up, false);
  assert.equal(patch?.b, true);
});

test("stage one mandatory spread gate pursues the late weapon before boss approach", () => {
  const patch = stageOneMandatorySpreadGatePatch({
    level: 0,
    worldX: 2298,
    playerX: 118,
    playerY: 168,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: 58, aim: "down" }
    },
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: false, type: 0x00, x: 150, y: 196 }
    ]
  }, true, 4400);

  assert.equal(patch?.reason, "stage-one-mandatory-spread-gate");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.down, true);
  assert.equal(patch?.up, false);
  assert.equal(patch?.b, true);
  assert.equal(patch?.a, false);
});

test("stage one mandatory spread gate still upgrades rapid to spread", () => {
  const patch = stageOneMandatorySpreadGatePatch({
    level: 0,
    worldX: 2318,
    playerX: 130,
    playerY: 154,
    weapon: 0x11,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: 24, aim: "auto" }
    },
    enemies: []
  }, false, 4420);

  assert.equal(patch?.reason, "stage-one-mandatory-spread-gate");
  assert.equal(patch?.right, true);
  assert.equal(patch?.left, false);
  assert.equal(patch?.b, true);
});

test("stage one mandatory spread gate exits after spread or after the no-loop window", () => {
  const spreadPatch = stageOneMandatorySpreadGatePatch({
    level: 0,
    worldX: 2318,
    playerX: 130,
    playerY: 154,
    weapon: 0x03,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: 24, aim: "down" }
    },
    enemies: []
  }, false, 4420);
  const expiredPatch = stageOneMandatorySpreadGatePatch({
    level: 0,
    worldX: 2372,
    playerX: 130,
    playerY: 154,
    weapon: 0,
    horizon: {
      fixedAhead: null,
      rewardAhead: { category: "reward", distance: -18, aim: "down" }
    },
    enemies: [
      { fixed: false, hp: 1, kind: "object", routine: 0, threat: false, type: 0x00, x: 120, y: 196 }
    ]
  }, true, 4480);

  assert.equal(spreadPatch, null);
  assert.equal(expiredPatch, null);
});
