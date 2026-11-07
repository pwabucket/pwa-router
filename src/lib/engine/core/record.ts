import { ROUTER_KEY_PREFIX, ROUTER_RECORD } from "../../../constants";

/** The address of a location */
export interface Address {
  pathname: string;
  search: string;
  hash: string;
}

/** A step's unique id */
export type StepId = string;

/** What added a step: a navigation to a page, or a pushed location state value */
export type StepKind = "page" | "layer";

/** A step's address and values, kept to restore it where it has no entry */
export interface StepSnapshot {
  pathname: string;
  search: string;
  hash: string;
  /** App values, as top-level keys of location.state */
  values: Record<string, unknown>;
  /** The engine's record of those values and of the areas inside the step */
  record: EntryRecord;
}

/** One step of an area: an entry's worth of state */
export interface StepRecord {
  id: StepId;
  kind: StepKind;
  /** The step's first entry: history length right after it was pushed; null while virtual */
  position: number | null;
  /** Kept for steps below the current one, to save and restore their tab */
  snapshot?: StepSnapshot;
}

/** A pushed or in-place location state value */
export interface ValueRecord {
  /** The area the value was set in */
  area: string;
  /** The step of its first push; absent for in-place values */
  first?: StepId;
  /** The step of its latest push; absent for in-place values */
  latest?: StepId;
  /** Kept after a reload */
  persist: boolean;
  /** Carried into entries pushed by other values */
  inherit: boolean;
}

/** A run of entries with one owner: the app (root) or a tabbed area */
export interface AreaRecord {
  id: string;
  /** The tab on show; the root area's single tab is "" */
  active: string;
  /** The tab at the bottom of the area; "" for the root area */
  defaultTab: string;
  /** The active tab's steps, lowest first, the current one last */
  steps: StepRecord[];
  /** Other tabs' steps, the top one last */
  saved: Record<string, StepRecord[]>;
  /** Bumped on every change of `saved` */
  savedVersion: number;
  /** The area's first entry */
  start: number;
  /** React Router's index of the first entry */
  startIndex: number;
  /** The address a tab area was opened on; its tabs without a root start there */
  address?: Address;
}

/** The engine's record on an entry */
export interface EntryRecord {
  /** Recorded app values by key */
  values: Record<string, ValueRecord>;
  /** The areas on the live path, outermost (root) first */
  areas: AreaRecord[];
  /** The leave guard whose question is open */
  question?: string;
}

/** The id of the root area */
export const ROOT_AREA = "root";

/** An area with no steps yet */
export const createArea = (
  id: string,
  active: string,
  start: number,
  startIndex: number,
  defaultTab = "",
): AreaRecord => ({
  id,
  active,
  defaultTab,
  steps: [],
  saved: {},
  savedVersion: 0,
  start,
  startIndex,
});

/** A record with only the root area */
export const createRecord = (): EntryRecord => ({
  values: {},
  areas: [createArea(ROOT_AREA, "", 0, 0)],
});

/** A location state's record, if it has one */
export const readRecord = (state: unknown) => {
  const record = (state as Record<string, unknown> | null | undefined)?.[
    ROUTER_RECORD
  ];
  return record as EntryRecord | undefined;
};

/** An entry's state and record; a state without one gets an empty record */
export const readEntry = (
  state: unknown,
): { state: Record<string, unknown>; record: EntryRecord } => {
  const current = (state as Record<string, unknown> | null | undefined) ?? {};
  return { state: current, record: readRecord(current) ?? createRecord() };
};

/** A location state with the record written into it */
export const writeRecord = (
  state: Record<string, unknown>,
  record: EntryRecord,
) => ({ ...state, [ROUTER_RECORD]: record });

/** The app values of a location state: every key but the engine's */
export const readAppValues = (state: unknown) => {
  /* The app values found */
  const values: Record<string, unknown> = {};

  /* Copy every key but the engine's */
  for (const [key, value] of Object.entries(
    (state as Record<string, unknown> | null | undefined) ?? {},
  )) {
    if (!key.startsWith(ROUTER_KEY_PREFIX)) values[key] = value;
  }

  return values;
};

/** A location state without the record; other keys stay */
export const withoutRecord = (state: unknown) => {
  const { [ROUTER_RECORD]: _, ...rest } =
    (state as Record<string, unknown> | null | undefined) ?? {};
  return rest;
};

/** An area of the record, by id */
export const findArea = (record: EntryRecord, areaId: string) =>
  record.areas.find((area) => area.id === areaId);

/** The innermost area on the live path */
export const innermostArea = (record: EntryRecord) =>
  record.areas[record.areas.length - 1];

/** The record with one area changed */
export const updateArea = (
  record: EntryRecord,
  areaId: string,
  update: (area: AreaRecord) => AreaRecord,
): EntryRecord => ({
  ...record,
  areas: record.areas.map((area) => (area.id === areaId ? update(area) : area)),
});
