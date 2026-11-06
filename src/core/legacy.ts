import {
  createRecord,
  readRecord,
  type EntryRecord,
  type ValueRecord,
  ROOT_AREA,
} from "./record";

/** 0.0.25's key for non-persistent values: a map of key → index key */
const LEGACY_EPHEMERAL_KEYS = "__router_ephemeral_keys";

/** 0.0.25's key for non-inherited values: a list of keys */
const LEGACY_NON_INHERITED_KEYS = "__router_non_inherited_keys";

/** 0.0.25's prefix for stamped indexes */
const LEGACY_INDEX_PREFIX = "__router_index_";

/** The keys 0.0.25 stored next to app values */
const isLegacyKey = (key: string) =>
  key === LEGACY_EPHEMERAL_KEYS ||
  key === LEGACY_NON_INHERITED_KEYS ||
  key.startsWith(LEGACY_INDEX_PREFIX);

/** A 0.0.25 state's flags as value records, without steps */
const convertLegacyFlags = (state: Record<string, unknown>) => {
  const ephemeral = state[LEGACY_EPHEMERAL_KEYS];
  const nonInherited = state[LEGACY_NON_INHERITED_KEYS];

  /* The keys of each kind */
  const ephemeralKeys = Array.isArray(ephemeral)
    ? (ephemeral as string[])
    : Object.keys((ephemeral as object | undefined) ?? {});
  const nonInheritedKeys = Array.isArray(nonInherited)
    ? (nonInherited as string[])
    : [];

  /* One record per flagged value that is still set */
  const values: Record<string, ValueRecord> = {};

  for (const key of new Set([...ephemeralKeys, ...nonInheritedKeys])) {
    if (state[key] == null) continue;
    values[key] = {
      area: ROOT_AREA,
      persist: !ephemeralKeys.includes(key),
      inherit: !nonInheritedKeys.includes(key),
    };
  }

  return values;
};

/** An entry's state and record, converting state written by 0.0.25 */
export const readEntry = (
  state: unknown,
): { state: Record<string, unknown>; record: EntryRecord } => {
  const current = (state as Record<string, unknown> | null | undefined) ?? {};
  const record = readRecord(current);

  /* Written by this version */
  if (record) return { state: current, record };

  /* Written by 0.0.25, or by the app alone */
  const appState: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(current)) {
    if (!isLegacyKey(key)) appState[key] = value;
  }

  return {
    state: appState,
    record: { ...createRecord(), values: convertLegacyFlags(current) },
  };
};
