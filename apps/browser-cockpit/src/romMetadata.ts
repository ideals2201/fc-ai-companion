export type NesRomFormat = "iNES" | "NES 2.0" | "Unknown";
export type NesMirroring = "Horizontal" | "Vertical" | "Four-screen" | "Unknown";

export type LocalRomFileInfo = {
  fileName?: string;
  filePath?: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
  sizeBytes?: number;
};

export type RomSupportStatus = "supported" | "reference" | "unsupported" | "unknown";

export type RomProfile = {
  gameId: string;
  romProfileId: string;
  label: string;
  region: string;
  md5: string;
  sha1: string;
  sha256?: string;
  compatibilityGroup: string;
  support: RomSupportStatus;
  supportLabel: string;
};

export type RomMetadata = {
  displayTitle: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sizeLabel: string;
  md5: string;
  md5Short: string;
  sha1: string;
  sha1Short: string;
  sha256: string;
  sha256Short: string;
  format: NesRomFormat;
  versionLabel: string;
  gameId: string;
  romProfileId: string;
  romProfileLabel: string;
  romSupport: RomSupportStatus;
  romSupportLabel: string;
  compatibilityGroup: string;
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

export const knownRomProfiles: RomProfile[] = [
  {
    gameId: "contra",
    romProfileId: "contra-us-good",
    label: "Contra (U) [!]",
    region: "US",
    md5: "7bdad8b4a7a56a634c9649d20bd3011b",
    sha1: "c9ea66bb7cb30ad5343f1721b1d4d3219859319b",
    sha256: "26541a5550ee22deeb3d5484e4a96130219b58cff74d068fb1eb6567fa5e5519",
    compatibilityGroup: "contra-us",
    support: "supported",
    supportLabel: "正式适配"
  },
  {
    gameId: "contra",
    romProfileId: "contra-japan-good-a",
    label: "魂斗罗 (J) [!]",
    region: "Japan",
    md5: "0e40bc1b049c16c5d7246cc28399cb5d",
    sha1: "376836361f404c815d404e1d5903d5d11f4eff0e",
    compatibilityGroup: "contra-japan",
    support: "reference",
    supportLabel: "资料参考"
  },
  {
    gameId: "contra",
    romProfileId: "contra-japan-good-b",
    label: "Contra (J) [!]",
    region: "Japan",
    md5: "d306c54ccfdf5cb4f8ec588f19b3e33d",
    sha1: "be9dd65be8db897978dd34533dd3a037784a8ee9",
    compatibilityGroup: "contra-japan",
    support: "reference",
    supportLabel: "资料参考"
  },
  {
    gameId: "contra",
    romProfileId: "contra-kc",
    label: "Contra (KC)",
    region: "US",
    md5: "2686c4b168a7e82bdb2c6fb3061fcbfd",
    sha1: "0103887f489bcce044c73ad49057a714753b0517",
    compatibilityGroup: "contra-us",
    support: "reference",
    supportLabel: "待验证"
  },
  {
    gameId: "contra",
    romProfileId: "probotector-e-good",
    label: "Probotector (E) [!]",
    region: "Europe",
    md5: "7127f616c13b58087481dd9e93aeb2ff",
    sha1: "6531ff3a062c2a83fa9683bf8a859a3500e8d9af",
    compatibilityGroup: "probotector-e",
    support: "reference",
    supportLabel: "资料参考"
  },
  {
    gameId: "contra",
    romProfileId: "contra-j-english-hack",
    label: "Contra (J) English Hack",
    region: "Japan",
    md5: "337eb76fc979a62961837a2cb258a6cd",
    sha1: "8e9c886ab94ce5fd17a875f4bb0cfdd47daa6bf9",
    compatibilityGroup: "contra-japan",
    support: "unsupported",
    supportLabel: "不用于正式策略"
  }
];

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
    md5: normalizeHash(headers.get("x-rom-md5") ?? ""),
    sha1: normalizeHash(headers.get("x-rom-sha1") ?? ""),
    sha256: normalizeHash(headers.get("x-rom-sha256") ?? ""),
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : undefined
  };
}

function normalizeHash(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function identifyRomProfile(fileInfo: Pick<LocalRomFileInfo, "md5" | "sha1" | "sha256">) {
  const md5 = normalizeHash(fileInfo.md5);
  const sha1 = normalizeHash(fileInfo.sha1);
  const sha256 = normalizeHash(fileInfo.sha256);
  return knownRomProfiles.find((profile) => (
    (md5 && profile.md5 === md5)
    || (sha1 && profile.sha1 === sha1)
    || (sha256 && profile.sha256 === sha256)
  )) ?? null;
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
  const md5 = normalizeHash(fileInfo.md5);
  const sha1 = normalizeHash(fileInfo.sha1);
  const sha256 = normalizeHash(fileInfo.sha256);
  const profile = identifyRomProfile({ md5, sha1, sha256 });

  return {
    displayTitle: stripExtension(fileName),
    fileName,
    filePath,
    sizeBytes,
    sizeLabel: formatRomSize(sizeBytes),
    md5,
    md5Short: md5.slice(0, 12),
    sha1,
    sha1Short: sha1.slice(0, 12),
    sha256,
    sha256Short: sha256.slice(0, 12),
    format,
    versionLabel: profile?.label ?? (format === "Unknown" ? "Unknown format" : format),
    gameId: profile?.gameId ?? "unknown",
    romProfileId: profile?.romProfileId ?? "unknown",
    romProfileLabel: profile?.label ?? "未知 ROM",
    romSupport: profile?.support ?? "unknown",
    romSupportLabel: profile?.supportLabel ?? "未识别",
    compatibilityGroup: profile?.compatibilityGroup ?? "",
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
