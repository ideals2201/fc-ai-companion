export type HeadlessPlayerSide = "1P" | "2P";
export type HeadlessButtonName = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
export type HeadlessButtonState = Record<HeadlessButtonName, boolean>;

export type HeadlessEnemySlotSnapshot = {
  slot: number;
  type: number;
  hp: number;
  x: number;
  y: number;
  routine: number;
  vx: number;
  vy: number;
  attackDelay: number;
  animationFrame: number;
  scoreCollision: number;
  scoreCode: number;
  collisionCode: number;
  attr: number;
  kind: "durable" | "projectile" | "enemy" | "object";
  threat: boolean;
  fixed: boolean;
  priority: number;
};

export type HeadlessPlayerBulletSnapshot = {
  slot: number;
  bulletSlotCode: number;
  owner: number;
  routine: number;
  x: number;
  y: number;
  spriteCode: number;
};

export type HeadlessGameRamSnapshot = {
  frame: number;
  level: number;
  playerMode: number;
  playerModeAlt: number;
  p1Lives: number;
  p2Lives: number;
  p1Score: number;
  p2Score: number;
  highScore: number;
  gameOver: number;
  p2GameOver: number;
  bossDefeated: number;
  screen: number;
  scroll: number;
  cameraX: number;
  p1State: number;
  p2State: number;
  jumpState: number;
  p2JumpState: number;
  weapon: number;
  p2Weapon: number;
  p1BarrierTimer: number;
  p2BarrierTimer: number;
  deathFlag: number;
  p2DeathFlag: number;
  playerX: number;
  playerY: number;
  worldX: number;
  p2PlayerX: number;
  p2PlayerY: number;
  p2WorldX: number;
  twoPlayerActive: boolean;
  bullets: HeadlessPlayerBulletSnapshot[];
  enemies: HeadlessEnemySlotSnapshot[];
};

type NesWithCpuRam = {
  cpu?: {
    mem?: ArrayLike<number>;
  };
};

const STAGE_ONE_LEVEL_INDEX = 0;
const PLAYER_ALIVE_STATE = 1;
const PLAYER_DEAD_STATE = 2;
const ENEMY_SLOT_COUNT = 26;
const PLAYER_BULLET_SLOT_COUNT = 8;

export function createHeadlessButtonState(): HeadlessButtonState {
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

function signedByte(value: number) {
  return value > 127 ? value - 256 : value;
}

export function readHeadlessCpuRamByte(nes: NesWithCpuRam | null, address: number) {
  const ram = nes?.cpu?.mem;
  if (!ram) return 0;
  return ram[address & 0x7ff] ?? 0;
}

function readScoreUnits(read: (address: number) => number, lowAddress: number) {
  const units = read(lowAddress) | (read(lowAddress + 1) << 8);
  return units === 0xffff ? 0 : units * 100;
}

function enemyKind(type: number, hp: number, routine: number): HeadlessEnemySlotSnapshot["kind"] {
  if (hp > 1) return "durable";
  if (type >= 0x40) return "projectile";
  if (routine > 0) return "enemy";
  return "object";
}

function isBulletSlotActive(routine: number, bulletSlotCode: number, x: number, y: number, spriteCode: number) {
  return routine !== 0 || bulletSlotCode !== 0 || spriteCode !== 0 || (x !== 0 && y !== 0);
}

function isEnemySlotActive(type: number, hp: number, routine: number, x: number, y: number) {
  return routine !== 0 || type !== 0 || hp !== 0 || (x !== 0 && y !== 0);
}

function enemyThreat(type: number, hp: number, routine: number, x: number, y: number) {
  if (!isEnemySlotActive(type, hp, routine, x, y)) return false;
  if (x <= 4 || x >= 252 || y <= 4 || y >= 236) return false;
  return hp > 0 || routine > 0 || type > 0;
}

export function readHeadlessGameRamSnapshot(
  nes: NesWithCpuRam | null,
  frame: number
): HeadlessGameRamSnapshot | null {
  if (!nes) return null;

  const read = (address: number) => readHeadlessCpuRamByte(nes, address);
  const screen = read(0x0064);
  const scroll = read(0x0065);
  const playerX = read(0x0334);
  const playerY = read(0x031a);
  const p2PlayerX = read(0x0335);
  const p2PlayerY = read(0x031b);
  const playerMode = read(0x0022);
  const playerModeAlt = read(0x001d);
  const p2Lives = read(0x0033);
  const p2GameOver = read(0x0039);
  const p2State = read(0x0091);
  const p2DeathFlag = read(0x00b5);
  const cameraX = screen * 256 + scroll;
  const enemies: HeadlessEnemySlotSnapshot[] = [];
  const bullets: HeadlessPlayerBulletSnapshot[] = [];

  for (let slot = 0; slot < PLAYER_BULLET_SLOT_COUNT; slot += 1) {
    const y = read(0x03b8 + slot);
    const x = read(0x03c8 + slot);
    const bulletSlotCode = read(0x0388 + slot);
    const routine = read(0x0438 + slot);
    const owner = read(0x0448 + slot);
    const spriteCode = read(0x0368 + slot);
    if (!isBulletSlotActive(routine, bulletSlotCode, x, y, spriteCode)) continue;
    bullets.push({ slot, bulletSlotCode, owner, routine, x, y, spriteCode });
  }

  for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot += 1) {
    const y = read(0x0324 + slot);
    const x = read(0x033e + slot);
    const routine = read(0x04b8 + slot);
    const vy = signedByte(read(0x04e8 + slot));
    const vx = signedByte(read(0x0508 + slot));
    const type = read(0x0528 + slot);
    const attackDelay = read(0x0558 + slot);
    const animationFrame = read(0x0568 + slot);
    const hp = read(0x0578 + slot);
    const scoreCollision = read(0x0588 + slot);
    const attr = read(0x05a8 + slot);

    if (!isEnemySlotActive(type, hp, routine, x, y)) continue;

    const threat = enemyThreat(type, hp, routine, x, y);
    enemies.push({
      slot,
      type,
      hp,
      x,
      y,
      routine,
      vx,
      vy,
      attackDelay,
      animationFrame,
      scoreCollision,
      scoreCode: scoreCollision >> 4,
      collisionCode: scoreCollision & 0x0f,
      attr,
      kind: enemyKind(type, hp, routine),
      threat,
      fixed: vx === 0 && vy === 0,
      priority: threat ? Math.max(1, Math.min(9, hp + (attackDelay > 0 ? 1 : 0))) : 0
    });
  }

  return {
    frame,
    level: read(0x0030),
    playerMode,
    playerModeAlt,
    p1Lives: read(0x0032),
    p2Lives,
    p1Score: readScoreUnits(read, 0x07e2),
    p2Score: readScoreUnits(read, 0x07e4),
    highScore: readScoreUnits(read, 0x07e0),
    gameOver: read(0x0038),
    p2GameOver,
    bossDefeated: read(0x003b),
    screen,
    scroll,
    cameraX,
    p1State: read(0x0090),
    p2State,
    jumpState: read(0x00a0),
    p2JumpState: read(0x00a1),
    weapon: read(0x00aa),
    p2Weapon: read(0x00ab),
    p1BarrierTimer: read(0x00b0),
    p2BarrierTimer: read(0x00b1),
    deathFlag: read(0x00b4),
    p2DeathFlag,
    playerX,
    playerY,
    worldX: cameraX + playerX,
    p2PlayerX,
    p2PlayerY,
    p2WorldX: cameraX + p2PlayerX,
    twoPlayerActive: playerMode === 0x01,
    bullets,
    enemies
  };
}

export function isHeadlessPlausibleRamSnapshot(
  snapshot: HeadlessGameRamSnapshot | null
): snapshot is HeadlessGameRamSnapshot {
  return Boolean(snapshot)
    && snapshot?.level !== 0xff
    && snapshot?.screen !== 0xff
    && snapshot?.p1State !== 0xff;
}

function isLikelyAttractDemo(snapshot: HeadlessGameRamSnapshot | null, frame = Number.POSITIVE_INFINITY) {
  if (!snapshot || frame >= 720) return false;
  return snapshot.level === STAGE_ONE_LEVEL_INDEX
    && snapshot.p1State === PLAYER_ALIVE_STATE
    && snapshot.deathFlag === 0
    && snapshot.worldX >= 256
    && snapshot.screen >= 1
    && snapshot.p1Score > 0;
}

export function isHeadlessGameplayActive(snapshot: HeadlessGameRamSnapshot | null, frame?: number) {
  if (!snapshot) return false;
  return snapshot.gameOver === 0
    && snapshot.p1State === PLAYER_ALIVE_STATE
    && snapshot.playerX > 0
    && snapshot.playerY > 0
    && !isLikelyAttractDemo(snapshot, frame);
}

function isLikelyGameMenu(snapshot: HeadlessGameRamSnapshot | null) {
  if (!snapshot) return true;
  return snapshot.p1State === 0
    && snapshot.deathFlag === 0
    && snapshot.screen === 0
    && snapshot.worldX === 0
    && snapshot.playerX === 0
    && snapshot.playerY === 0;
}

function isStartableMenuState(snapshot: HeadlessGameRamSnapshot | null) {
  if (!snapshot) return true;
  return isLikelyGameMenu(snapshot)
    || (
      snapshot.gameOver === 0
      && snapshot.deathFlag === 0
      && snapshot.p1State === 0
      && snapshot.level === STAGE_ONE_LEVEL_INDEX
      && snapshot.screen === 0
      && snapshot.worldX <= 96
      && snapshot.enemies.length === 0
    );
}

function isDeathOrRespawnTransition(snapshot: HeadlessGameRamSnapshot | null) {
  if (!isHeadlessPlausibleRamSnapshot(snapshot)) return false;
  return snapshot.p1State === PLAYER_DEAD_STATE
    || snapshot.deathFlag !== 0
    || (snapshot.p1State === 0 && !isStartableMenuState(snapshot));
}

export function runtimeStartupButtons(
  snapshot: HeadlessGameRamSnapshot | null,
  frame: number,
  twoPlayerRequested: boolean,
  twoPlayerActive: boolean
) {
  const next = createHeadlessButtonState();
  if (!snapshot || isDeathOrRespawnTransition(snapshot) || isHeadlessGameplayActive(snapshot, frame)) return next;
  if (isLikelyAttractDemo(snapshot, frame)) {
    next.start = frame % 30 < 18;
    return next;
  }
  if (!isStartableMenuState(snapshot)) return next;
  if (twoPlayerRequested && !twoPlayerActive) {
    const phase = frame % 180;
    next.select = phase >= 20 && phase < 48;
    next.start = phase >= 72 && phase < 96;
    return next;
  }
  next.start = frame < 420 ? frame % 30 < 18 : frame % 90 < 24;
  return next;
}
