export type NesRomFormat = "iNES" | "NES 2.0" | "Unknown";
export type NesMirroring = "Horizontal" | "Vertical" | "Four-screen" | "Unknown";

export type LocalRomFileInfo = {
  fileName?: string;
  filePath?: string;
  sha256?: string;
  sizeBytes?: number;
};

export type RomMetadata = {
  displayTitle: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sizeLabel: string;
  sha256: string;
  sha256Short: string;
  format: NesRomFormat;
  versionLabel: string;
  prgRomBanks: number;
  prgRomKb: number;
  chrRomBanks: number;
  chrRomKb: number;
  mapper: number | null;
  mapperLabel: string;
  mirroring: NesMirroring;
  battery: boolean;
  trainer: boolean;
};

const NES_MAGIC = [0x4e, 0x45, 0x53, 0x1a] as const;

export function decodeRomHeaderValue(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function formatRomSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function readRomMetadataHeaders(headers: Headers): LocalRomFileInfo {
  const sizeHeader = headers.get("x-rom-size");
  const sizeBytes = sizeHeader ? Number(sizeHeader) : undefined;
  return {
    fileName: decodeRomHeaderValue(headers.get("x-rom-file-name")),
    filePath: decodeRomHeaderValue(headers.get("x-rom-file-path")),
    sha256: headers.get("x-rom-sha256") ?? "",
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : undefined
  };
}

function hasNesMagic(bytes: Uint8Array) {
  return NES_MAGIC.every((value, index) => bytes[index] === value);
}

function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? "";
}

function stripExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return fileName;
  return fileName.slice(0, lastDot);
}

function detectFormat(bytes: Uint8Array): NesRomFormat {
  if (bytes.length < 16 || !hasNesMagic(bytes)) return "Unknown";
  return (bytes[7] & 0x0c) === 0x08 ? "NES 2.0" : "iNES";
}

function detectMirroring(flags6: number, format: NesRomFormat): NesMirroring {
  if (format === "Unknown") return "Unknown";
  if ((flags6 & 0x08) !== 0) return "Four-screen";
  return (flags6 & 0x01) !== 0 ? "Vertical" : "Horizontal";
}

function detectMapper(bytes: Uint8Array, format: NesRomFormat) {
  if (format === "Unknown") return null;
  const mapper = (bytes[6] >> 4) | (bytes[7] & 0xf0);
  if (format === "NES 2.0") return mapper | ((bytes[8] & 0x0f) << 8);
  return mapper;
}

export function parseNesRomMetadata(bytes: Uint8Array, fileInfo: LocalRomFileInfo = {}): RomMetadata {
  const filePath = fileInfo.filePath ?? "";
  const fileName = fileInfo.fileName || basename(filePath) || "local-rom";
  const sizeBytes = fileInfo.sizeBytes ?? bytes.byteLength;
  const format = detectFormat(bytes);
  const mapper = detectMapper(bytes, format);
  const flags6 = bytes[6] ?? 0;
  const sha256 = fileInfo.sha256 ?? "";

  return {
    displayTitle: stripExtension(fileName),
    fileName,
    filePath,
    sizeBytes,
    sizeLabel: formatRomSize(sizeBytes),
    sha256,
    sha256Short: sha256.slice(0, 12),
    format,
    versionLabel: format === "Unknown" ? "Unknown format" : format,
    prgRomBanks: format === "Unknown" ? 0 : bytes[4],
    prgRomKb: format === "Unknown" ? 0 : bytes[4] * 16,
    chrRomBanks: format === "Unknown" ? 0 : bytes[5],
    chrRomKb: format === "Unknown" ? 0 : bytes[5] * 8,
    mapper,
    mapperLabel: mapper === null ? "Unknown" : `Mapper ${mapper}`,
    mirroring: detectMirroring(flags6, format),
    battery: format !== "Unknown" && (flags6 & 0x02) !== 0,
    trainer: format !== "Unknown" && (flags6 & 0x04) !== 0
  };
}
