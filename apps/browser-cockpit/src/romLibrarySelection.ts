type RomHashFields = {
  md5?: string;
  headerlessMd5?: string;
  sha1?: string;
};

type RomEntryLike = {
  id: string;
  relativePath?: string;
  metadata: RomHashFields;
};

function normalizeHash(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeRelativePath(value: string | null | undefined) {
  return (value ?? "").trim().replaceAll("\\", "/").toLowerCase();
}

export function findLoadedRomEntryId(entries: RomEntryLike[], loaded: RomHashFields | null) {
  if (!loaded) return null;
  const md5 = normalizeHash(loaded.md5);
  const headerlessMd5 = normalizeHash(loaded.headerlessMd5);
  const sha1 = normalizeHash(loaded.sha1);
  const match = entries.find((entry) => {
    const metadata = entry.metadata;
    return (
      (!!md5 && normalizeHash(metadata.md5) === md5)
      || (!!headerlessMd5 && normalizeHash(metadata.headerlessMd5) === headerlessMd5)
      || (!!sha1 && normalizeHash(metadata.sha1) === sha1)
    );
  });
  return match?.id ?? null;
}

export function findRomEntryIdByRelativePath(entries: RomEntryLike[], requestedPath: string | null | undefined) {
  const requested = normalizeRelativePath(requestedPath);
  if (!requested) return null;
  return entries.find((entry) => normalizeRelativePath(entry.relativePath) === requested)?.id ?? null;
}

export function resolveSelectedRomIdAfterLoadedSync(
  entries: RomEntryLike[],
  loaded: RomHashFields | null,
  currentSelectedId: string,
  manualSelectionActive: boolean
) {
  if (manualSelectionActive) return currentSelectedId;
  return findLoadedRomEntryId(entries, loaded) ?? currentSelectedId;
}
