// jsnes 2.1.0 does not ship mapper 23. Contra (J) uses Konami VRC2
// under iNES mapper 23, so we register a local mapper before loading ROMs.
// This is intentionally scoped to the browser cockpit runtime.
// @ts-expect-error jsnes does not expose mapper internals in its type declarations.
import Mapper0 from "../../../node_modules/jsnes/src/mappers/mapper0.js";
// @ts-expect-error jsnes does not expose mapper internals in its type declarations.
import Mappers from "../../../node_modules/jsnes/src/mappers/index.js";

const KIB_8 = 0x2000;

class Mapper23 extends Mapper0 {
  static mapperName = "Konami VRC2/VRC4";

  private prg0 = 0;
  private prg1 = 1;
  private latch = 0;
  private chrBanks = new Array<number>(8).fill(0);
  private chrLow = new Array<number>(8).fill(0);
  private chrHigh = new Array<number>(8).fill(0);

  private get mapperBase(): any {
    return this as any;
  }

  private normalizeRegister(address: number) {
    const low = address & 0x000f;
    if (low <= 0x03) return low;
    if (low === 0x04) return 0x01;
    if (low === 0x08) return 0x02;
    if (low === 0x0c) return 0x03;
    return address & 0x0003;
  }

  private syncPrgBanks() {
    const bankCount = Math.max(1, this.mapperBase.nes.rom.romCount * 2);
    this.mapperBase.load8kRomBank(this.prg0 % bankCount, 0x8000);
    this.mapperBase.load8kRomBank(this.prg1 % bankCount, 0xa000);
    this.mapperBase.load8kRomBank(Math.max(0, bankCount - 2), 0xc000);
    this.mapperBase.load8kRomBank(Math.max(0, bankCount - 1), 0xe000);
  }

  private syncChrBank(index: number) {
    const bank = this.chrBanks[index] & 0x1ff;
    this.mapperBase.load1kVromBank(bank, index * 0x0400);
  }

  private setChrNibble(index: number, high: boolean, value: number) {
    if (high) {
      this.chrHigh[index] = value & 0x0f;
    } else {
      this.chrLow[index] = value & 0x0f;
    }
    this.chrBanks[index] = this.chrLow[index] | (this.chrHigh[index] << 4);
    this.syncChrBank(index);
  }

  private writeMapperRegister(address: number, value: number) {
    const region = address & 0xf000;
    const register = this.normalizeRegister(address);

    if (region === 0x8000) {
      this.prg0 = value & 0x1f;
      this.syncPrgBanks();
      return;
    }

    if (region === 0x9000) {
      this.mapperBase.nes.ppu.setMirroring(
        (value & 1) !== 0
          ? this.mapperBase.nes.rom.HORIZONTAL_MIRRORING
          : this.mapperBase.nes.rom.VERTICAL_MIRRORING
      );
      return;
    }

    if (region === 0xa000) {
      this.prg1 = value & 0x1f;
      this.syncPrgBanks();
      return;
    }

    if (region >= 0xb000 && region <= 0xe000) {
      const pairBase = ((region - 0xb000) >> 12) * 2;
      const chrIndex = pairBase + (register >= 2 ? 1 : 0);
      this.setChrNibble(chrIndex, (register & 1) === 1, value);
    }
  }

  load(address: number) {
    const normalized = address & 0xffff;
    if (normalized >= 0x6000 && normalized < 0x7000) {
      return ((normalized >> 8) & 0xfe) | this.latch;
    }
    if (normalized >= 0x7000 && normalized < 0x8000) {
      return this.mapperBase.nes.cpu.dataBus;
    }
    return super.load(address);
  }

  write(address: number, value: number) {
    const normalized = address & 0xffff;
    const byte = value & 0xff;
    if (normalized < 0x6000) {
      super.write(normalized, byte);
      return;
    }
    if (normalized < 0x7000) {
      this.latch = byte & 1;
      return;
    }
    if (normalized < 0x8000) {
      return;
    }
    this.writeMapperRegister(normalized, byte);
  }

  writelow(address: number, value: number) {
    this.write(address, value);
  }

  loadROM() {
    if (!this.mapperBase.nes.rom.valid) {
      throw new Error("VRC2/VRC4: Invalid ROM! Unable to load.");
    }

    this.syncPrgBanks();
    for (let i = 0; i < this.chrBanks.length; i += 1) {
      this.syncChrBank(i);
    }
    this.mapperBase.loadBatteryRam();
    this.mapperBase.nes.cpu.requestIrq(this.mapperBase.nes.cpu.IRQ_RESET);
  }

  toJSON() {
    const state = super.toJSON();
    state.prg0 = this.prg0;
    state.prg1 = this.prg1;
    state.latch = this.latch;
    state.chrBanks = this.chrBanks;
    state.chrLow = this.chrLow;
    state.chrHigh = this.chrHigh;
    return state;
  }

  fromJSON(state: Record<string, unknown>) {
    super.fromJSON(state);
    this.prg0 = Number(state.prg0 ?? 0);
    this.prg1 = Number(state.prg1 ?? 1);
    this.latch = Number(state.latch ?? 0) & 1;
    this.chrBanks = Array.isArray(state.chrBanks) ? state.chrBanks.map(Number) : this.chrBanks;
    this.chrLow = Array.isArray(state.chrLow) ? state.chrLow.map(Number) : this.chrLow;
    this.chrHigh = Array.isArray(state.chrHigh) ? state.chrHigh.map(Number) : this.chrHigh;
  }
}

(Mappers as Record<number, typeof Mapper23>)[23] = Mapper23;

export { Mapper23 };
