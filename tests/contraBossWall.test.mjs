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
  decideBossWallMicroAction,
  isBossWallBailoutInput,
  isBossWallContactHazard
} = await importTypeScriptModule(new URL("../apps/browser-cockpit/src/contraStage1BossWall.ts", import.meta.url));

function enemy(overrides = {}) {
  return {
    slot: 4,
    type: 0x01,
    hp: 1,
    x: 134,
    y: 132,
    routine: 0,
    vx: 0,
    vy: 0,
    kind: "object",
    threat: true,
    fixed: false,
    priority: 1,
    ...overrides
  };
}

function snapshot(overrides = {}) {
  return {
    level: 0,
    bossDefeated: 0,
    worldX: 3199,
    playerX: 127,
    playerY: 128,
    jumpState: 177,
    enemies: [],
    ...overrides
  };
}

test("Boss wall contact hazards include near non-fixed object soldiers", () => {
  const contact = enemy({ type: 0x01, kind: "object", routine: 0, x: 134, y: 132 });

  assert.equal(isBossWallContactHazard(contact), true);
});

test("Boss wall airborne contact hazard ahead blocks right carry and keeps firing", () => {
  const decision = decideBossWallMicroAction(snapshot({
    enemies: [enemy({ x: 134, y: 132 })]
  }), 5294);

  assert.deepEqual(decision?.buttons, {
    up: false,
    down: false,
    left: false,
    right: false,
    select: false,
    start: false,
    b: true,
    a: false
  });
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne contact hazard far ahead does not pull left", () => {
  const decision = decideBossWallMicroAction(snapshot({
    playerX: 108,
    playerY: 76,
    jumpState: 49,
    enemies: [enemy({ x: 153, y: 80 })]
  }), 5193);

  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne contact hazard near landing keeps firing without left retreat", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3200,
    playerX: 128,
    playerY: 157,
    jumpState: 81,
    enemies: [enemy({ x: 131, y: 133, kind: "enemy", routine: 2 })]
  }), 5232);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall grounded contact hazard ahead fires in place instead of jumping", () => {
  const decision = decideBossWallMicroAction(snapshot({
    playerX: 109,
    playerY: 132,
    jumpState: 0,
    enemies: [enemy({ x: 145, y: 132 })]
  }), 5168);

  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall grounded same-lane close soldier jumps before contact", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3160,
    playerX: 88,
    playerY: 132,
    jumpState: 0,
    enemies: [enemy({ x: 104, y: 128, kind: "enemy", routine: 2 })]
  }), 5254);

  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-contact-jump");
});

test("Boss wall grounded lower soldier is cleared with down-fire instead of jump", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3160,
    playerX: 109,
    playerY: 132,
    jumpState: 0,
    enemies: [enemy({ x: 129, y: 150, kind: "enemy", routine: 2 })]
  }), 5168);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall very low grounded soldier still holds down-fire instead of pre-jump", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3160,
    playerX: 98,
    playerY: 132,
    jumpState: 0,
    enemies: [enemy({ x: 104, y: 180, kind: "enemy", routine: 2 })]
  }), 5179);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall grounded upper-right soldier in low stance is shot upward without left retreat", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [enemy({ x: 141, y: 182, kind: "object", routine: 0 })]
  }), 5344);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall airborne path carries right fire when no contact hazard exists", () => {
  const decision = decideBossWallMicroAction(snapshot({
    enemies: [enemy({ x: 190, y: 80, kind: "enemy", routine: 2 })]
  }), 5292);

  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "air-carry");
});

test("Boss wall high airborne lower soldier is held with down-fire instead of old left retreat", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3179,
    playerX: 107,
    playerY: 75,
    jumpState: 81,
    enemies: [enemy({ x: 125, y: 121, kind: "enemy", routine: 2 })]
  }), 5193);

  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, true);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall close airborne lower soldier gets down-fire without jump", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 110,
    jumpState: 49,
    enemies: [enemy({ x: 144, y: 122, kind: "enemy", routine: 2 })]
  }), 5231);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne falling soldier above-right triggers left strafe before contact", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 178,
    jumpState: 49,
    enemies: [enemy({
      slot: 12,
      type: 0x01,
      hp: 1,
      x: 147,
      y: 156,
      kind: "enemy",
      routine: 2
    })]
  }), 5383);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne falling soldier strafe stops left and begins recovery", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3207,
    playerX: 135,
    playerY: 184,
    jumpState: 81,
    enemies: [enemy({
      slot: 12,
      type: 0x01,
      hp: 1,
      x: 149,
      y: 152,
      kind: "enemy",
      routine: 2
    })]
  }), 5381);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall low airborne landing body threat bails out from the spawn lane", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 194,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 9,
        type: 0x01,
        hp: 1,
        x: 136,
        y: 208,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 10,
        type: 0x01,
        hp: 1,
        x: 151,
        y: 194,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 31,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5820);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, false);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall fixed-target station does not left-strafe the low soldier death loop", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 170,
    jumpState: 49,
    enemies: [
      enemy({ slot: 2, type: 0x01, hp: 1, x: 95, y: 192, kind: "enemy", routine: 2 }),
      enemy({ slot: 3, type: 0x01, hp: 1, x: 119, y: 192, kind: "enemy", routine: 2 }),
      enemy({ slot: 4, type: 0x01, hp: 1, x: 134, y: 138, kind: "enemy", routine: 2 }),
      enemy({ slot: 5, type: 0x01, hp: 1, x: 143, y: 192, kind: "enemy", routine: 2 }),
      enemy({ slot: 11, type: 0x10, hp: 14, x: 177, y: 128, kind: "durable", fixed: true, priority: 9 }),
      enemy({ slot: 13, type: 0x11, hp: 27, x: 161, y: 176, kind: "durable", fixed: true, priority: 9 }),
      enemy({ slot: 15, type: 0x10, hp: 13, x: 153, y: 128, kind: "durable", fixed: true, priority: 9 })
    ]
  }), 5777);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne descent targets rear low soldier before fixed wall parts", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 170,
    jumpState: 49,
    enemies: [
      enemy({ slot: 6, type: 0x01, hp: 1, x: 116, y: 185, kind: "enemy", routine: 2 }),
      enemy({ slot: 11, type: 0x10, hp: 16, x: 177, y: 128, kind: "durable", fixed: true, priority: 9 }),
      enemy({ slot: 13, type: 0x11, hp: 27, x: 161, y: 176, kind: "durable", fixed: true, priority: 9 })
    ]
  }), 5717);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne core collision lane overrides low body noise", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 176,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 9,
        type: 0x01,
        hp: 1,
        x: 136,
        y: 208,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 28,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 15,
        type: 0x10,
        hp: 15,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5719);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne direct body overlap bails out instead of core station fire", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 188,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 10,
        type: 0x01,
        hp: 1,
        x: 139,
        y: 188,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 27,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 15,
        type: 0x10,
        hp: 14,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5749);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, false);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall high airborne body threat strafes left before landing contact", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 145,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 1,
        type: 0x01,
        hp: 1,
        x: 143,
        y: 127,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 3,
        type: 0x01,
        hp: 1,
        x: 142,
        y: 135,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5730);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne overhead body threat outranks closer rear noise", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 148,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 8,
        type: 0x01,
        hp: 1,
        x: 129,
        y: 144,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 3,
        type: 0x01,
        hp: 1,
        x: 136,
        y: 129,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 30,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5728);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne station recovers right after a falling soldier strafe", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3206,
    playerX: 134,
    playerY: 181,
    jumpState: 81,
    enemies: [enemy({
      slot: 12,
      type: 0x01,
      hp: 1,
      x: 148,
      y: 154,
      kind: "enemy",
      routine: 2
    })]
  }), 5382);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne close overhead soldier outranks lower body noise", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 153,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 6,
        type: 0x01,
        hp: 1,
        x: 136,
        y: 129,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 8,
        type: 0x01,
        hp: 1,
        x: 125,
        y: 192,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 29,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5482);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall airborne contact fire releases B periodically for real shots", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 153,
    jumpState: 49,
    enemies: [enemy({
      slot: 6,
      type: 0x01,
      hp: 1,
      x: 136,
      y: 129,
      kind: "enemy",
      routine: 2
    })]
  }), 5483);

  assert.equal(decision?.buttons.b, false);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall grounded core in range holds stance fire instead of pre-jumping", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 128,
    playerY: 160,
    jumpState: 0,
    enemies: [enemy({
      slot: 13,
      type: 0x11,
      hp: 31,
      x: 161,
      y: 176,
      kind: "durable",
      fixed: true,
      priority: 4
    })]
  }), 5320);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-fixed-fire");
});

test("Boss wall low stance bails out instead of prioritizing fixed targets from the spawn lane", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5420);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall USA death-frame at WorldX 3159 engages fixed-target fire", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3159,
    playerX: 111,
    playerY: 132,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 185,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 201,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 7
      }),
      enemy({
        slot: 15,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 7
      })
    ]
  }), 5568);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "ground-fixed-fire");
});

test("Boss wall pre-entry safe height suppresses fixed targets instead of advancing", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3155,
    playerX: 115,
    playerY: 126,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 209,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 193,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5560);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, false);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "ground-fixed-fire");
});

test("Boss wall entry ignores lower-lane soldiers while advancing to the upper station", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3175,
    playerX: 103,
    playerY: 141,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 3,
        type: 0x01,
        hp: 1,
        x: 108,
        y: 192,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 30,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5770);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "ground-fixed-fire");
});

test("Boss wall airborne entry ignores lower-lane soldiers and carries right to station", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3175,
    playerX: 103,
    playerY: 141,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 3,
        type: 0x01,
        hp: 1,
        x: 108,
        y: 192,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 30,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5770);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "air-carry");
});

test("Boss wall airborne upper contact keeps right-up station fire when fixed targets remain", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3195,
    playerX: 123,
    playerY: 139,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 9,
        type: 0x01,
        hp: 1,
        x: 127,
        y: 137,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 15,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 27,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5687);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.down, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall upper lane overextended station retreats before firing fixed targets", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3203,
    playerX: 131,
    playerY: 143,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5658);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall upper lane rear contact bails out before the station is overrun", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3203,
    playerX: 131,
    playerY: 143,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 10,
        type: 0x01,
        hp: 1,
        x: 128,
        y: 142,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5658);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall upper airborne close body keeps left bailout instead of snapping back right", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 138,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 1,
        type: 0x01,
        hp: 1,
        x: 145,
        y: 128,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 31,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5729);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall upper swarm bails out before fixed-target station gets overrun", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 155,
    jumpState: 177,
    enemies: [
      enemy({ slot: 7, type: 0x01, hp: 1, x: 111, y: 158, kind: "enemy", routine: 2 }),
      enemy({ slot: 8, type: 0x01, hp: 1, x: 85, y: 209, kind: "enemy", routine: 3 }),
      enemy({ slot: 9, type: 0x01, hp: 1, x: 72, y: 210, kind: "object", routine: 0 }),
      enemy({ slot: 10, type: 0x01, hp: 1, x: 134, y: 132, kind: "enemy", routine: 2 }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 31,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 15,
        type: 0x10,
        hp: 16,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5650);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall upper lane high-hp fixed targets do not walk deeper into the station", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3203,
    playerX: 145,
    playerY: 143,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 15,
        type: 0x10,
        hp: 15,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5658);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall grounded death-frame body contact jumps left while firing", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 160,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 12,
        type: 0x01,
        hp: 1,
        x: 143,
        y: 171,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 31,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 4
      })
    ]
  }), 5388);

  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-contact-breakout");
});

test("Boss wall low stance bails out before fixed-target fire in the body spawn lane", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [enemy({
      slot: 13,
      type: 0x11,
      hp: 32,
      x: 161,
      y: 176,
      kind: "durable",
      fixed: true,
      priority: 9
    })]
  }), 5420);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall bailout input is marked as an action-lock override", () => {
  const snap = snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 188,
    jumpState: 0,
    enemies: [enemy({
      slot: 13,
      type: 0x11,
      hp: 31,
      x: 161,
      y: 176,
      kind: "durable",
      fixed: true,
      priority: 9
    })]
  });

  assert.equal(isBossWallBailoutInput(snap, {
    up: false,
    down: false,
    left: true,
    right: false,
    select: false,
    start: false,
    b: true,
    a: true
  }), true);
  assert.equal(isBossWallBailoutInput(snap, {
    up: true,
    down: false,
    left: false,
    right: true,
    select: false,
    start: false,
    b: true,
    a: false
  }), false);
});

test("Boss wall airborne low-lane descent bails out instead of station firing into core", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 188,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 13,
        type: 0x11,
        hp: 31,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 15,
        type: 0x10,
        hp: 13,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5699);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.up, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall mid-entry body contact bails out instead of carrying up-right into the wall", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3199,
    playerX: 127,
    playerY: 165,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 7,
        type: 0x01,
        hp: 1,
        x: 125,
        y: 163,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5648);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall low stance close falling soldier gets vertical up fire", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [enemy({
      slot: 7,
      type: 0x01,
      hp: 1,
      x: 147,
      y: 156,
      kind: "enemy",
      routine: 2
    })]
  }), 5478);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall low stance with fixed targets jumps and horizontally fires through close body collision", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 3,
        type: 0x01,
        hp: 1,
        x: 141,
        y: 182,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 24,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5748);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.up, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.reason, "ground-contact-breakout");
});

test("Boss wall low stance grounded direct body overlap jumps and fires before the death frame", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 192,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 10,
        type: 0x01,
        hp: 1,
        x: 141,
        y: 188,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 27,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 15,
        type: 0x10,
        hp: 14,
        x: 153,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5749);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.up, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.reason, "ground-contact-breakout");
});

test("Boss wall low stance with fixed targets keeps right-up fire against high close soldiers", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 3,
        type: 0x01,
        hp: 1,
        x: 148,
        y: 154,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 24,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5737);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall low stance fixed-target contact fire releases B for new bullets", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 3,
        type: 0x01,
        hp: 1,
        x: 148,
        y: 154,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 24,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5741);

  assert.equal(decision?.buttons.b, false);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.reason, "ground-contact-fire");
});

test("Boss wall low stance with rear overhead noise still bails out from the spawn lane", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 10,
        type: 0x01,
        hp: 1,
        x: 129,
        y: 156,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 30,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5482);

  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall low stance bailout keeps fire held while escaping the spawn lane", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [enemy({
      slot: 13,
      type: 0x11,
      hp: 30,
      x: 161,
      y: 176,
      kind: "durable",
      fixed: true,
      priority: 9
    })]
  }), 5483);

  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall airborne core forecast blocks right carry before body collision", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3199,
    playerX: 127,
    playerY: 171,
    jumpState: 81,
    enemies: [
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5646);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall airborne core forecast stays active when descending into the core lane", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3197,
    playerX: 125,
    playerY: 165,
    jumpState: 81,
    enemies: [
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5648);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall grounded core forecast blocks right on landing before fixed fire resumes", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3198,
    playerX: 126,
    playerY: 162,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5649);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "boss-wall-bailout");
});

test("Boss wall fixed-target falling soldier convergence freezes horizontal movement", () => {
  const snap = snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 172,
    jumpState: 49,
    enemies: [
      enemy({
        slot: 7,
        type: 0x01,
        hp: 1,
        x: 143,
        y: 134,
        kind: "enemy",
        fixed: false,
        threat: true,
        priority: 1
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  });
  const decision = decideBossWallMicroAction(snap, 5633);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
  assert.equal(isBossWallBailoutInput(snap, decision?.buttons), true);
});

test("Boss wall falling soldier convergence outranks core retreat when paths intersect", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3200,
    playerX: 128,
    playerY: 174,
    jumpState: 81,
    enemies: [
      enemy({
        slot: 7,
        type: 0x01,
        hp: 1,
        x: 130,
        y: 154,
        kind: "enemy",
        fixed: false,
        threat: true,
        priority: 1
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5645);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "air-contact-hold");
});

test("Boss wall high-hp fixed gate holds low lane instead of jumping into crowded spawn", () => {
  const snap = snapshot({
    worldX: 3206,
    playerX: 134,
    playerY: 196,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 7,
        type: 0x01,
        hp: 1,
        x: 137,
        y: 141,
        kind: "enemy",
        fixed: false,
        threat: true,
        priority: 1
      }),
      enemy({
        slot: 10,
        type: 0x01,
        hp: 1,
        x: 138,
        y: 124,
        kind: "enemy",
        fixed: false,
        threat: true,
        priority: 1
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 16,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  });
  const decision = decideBossWallMicroAction(snap, 5638);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.a, false);
  assert.equal(decision?.buttons.left, true);
  assert.equal(decision?.buttons.right, false);
  assert.equal(decision?.reason, "ground-fixed-fire");
  assert.equal(isBossWallBailoutInput(snap, decision?.buttons), true);
});

test("Boss wall low stance jumps over incoming low projectile cluster", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3208,
    playerX: 136,
    playerY: 196,
    jumpState: 0,
    enemies: [
      enemy({
        slot: 8,
        type: 0x01,
        hp: 1,
        x: 109,
        y: 209,
        vx: 2,
        kind: "object",
        routine: 0
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 32,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5392);

  assert.equal(decision?.buttons.a, true);
  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.reason, "ground-low-projectile-jump");
});

test("Boss wall airborne descent keeps right-up fire instead of freezing under close soldier", () => {
  const decision = decideBossWallMicroAction(snapshot({
    worldX: 3207,
    playerX: 135,
    playerY: 176,
    jumpState: 81,
    enemies: [
      enemy({
        slot: 7,
        type: 0x01,
        hp: 1,
        x: 151,
        y: 176,
        kind: "enemy",
        routine: 2
      }),
      enemy({
        slot: 11,
        type: 0x10,
        hp: 14,
        x: 177,
        y: 128,
        kind: "durable",
        fixed: true,
        priority: 9
      }),
      enemy({
        slot: 13,
        type: 0x11,
        hp: 27,
        x: 161,
        y: 176,
        kind: "durable",
        fixed: true,
        priority: 9
      })
    ]
  }), 5779);

  assert.equal(decision?.buttons.b, true);
  assert.equal(decision?.buttons.up, true);
  assert.equal(decision?.buttons.right, true);
  assert.equal(decision?.buttons.left, false);
  assert.equal(decision?.reason, "air-contact-hold");
});
