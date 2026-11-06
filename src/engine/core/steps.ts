import {
  findArea,
  type Address,
  readAppValues,
  type AreaRecord,
  type EntryRecord,
  type StepId,
  type StepKind,
  type StepRecord,
  type StepSnapshot,
  type ValueRecord,
} from "./record";

/** A value a saved step keeps: every one but those marked persist: false or inherit: false */
export const isKeptValue = (value: ValueRecord | undefined) =>
  !value || (value.persist && value.inherit);

/** Where a close lands */
export type CloseTarget =
  /** Go back one entry: the value has no record */
  | { kind: "back" }
  /** Land before an entry */
  | { kind: "land"; before: number }
  /** Show a virtual step in the tab's lowest real entry, first landing on it if needed */
  | {
      kind: "virtualPop";
      area: string;
      step: StepRecord;
      /** Land before this entry first, to reach the lowest real entry; null when already there */
      landBefore: number | null;
      /** The lowest real entry, which the virtual step takes */
      position: number;
    };

/** The index of a step in an area's steps */
export const findStepIndex = (area: AreaRecord, stepId: StepId | undefined) =>
  stepId === undefined
    ? -1
    : area.steps.findIndex((step) => step.id === stepId);

/** The index of the lowest step that has an entry */
export const findFirstRealIndex = (area: AreaRecord) =>
  area.steps.findIndex((step) => step.position !== null);

/** Where closing a value lands: before its push, or onto the virtual step below it */
export const findCloseTarget = (
  record: EntryRecord,
  key: string,
  toStart: boolean,
): CloseTarget => {
  const value = record.values[key];
  const area = value && findArea(record, value.area);
  const index = area
    ? findStepIndex(area, toStart ? value.first : value.latest)
    : -1;

  /* No record of the push: go back one entry */
  if (!area || index < 0) return { kind: "back" };

  const step = area.steps[index];
  const below = area.steps[index - 1];

  /* The step below has an entry, or there is none: land before the push */
  if (step.position !== null && (!below || below.position !== null)) {
    return { kind: "land", before: step.position };
  }

  const firstReal = findFirstRealIndex(area);
  const firstRealPosition = area.steps[firstReal].position!;

  /* Pushed on the tab's lowest step, which is virtual: leave the tab */
  if (!below) return { kind: "land", before: firstRealPosition };

  /* The step below is virtual: it takes the tab's lowest real entry */
  const aboveFirstReal = area.steps[firstReal + 1];

  return {
    kind: "virtualPop",
    area: area.id,
    step: below,
    landBefore: aboveFirstReal?.position ?? null,
    position: firstRealPosition,
  };
};

/** A new step, positioned once its entry lands */
export const createStep = (id: StepId, kind: StepKind): StepRecord => ({
  id,
  kind,
  position: null,
});

/** A snapshot of the current step: its address, kept values, and inner areas */
export const snapshotStep = (
  address: Address,
  state: unknown,
  record: EntryRecord,
  areaId: string,
): StepSnapshot => {
  const values: Record<string, unknown> = {};
  const valueRecords: Record<string, ValueRecord> = {};

  /* The values the snapshot keeps */
  for (const [key, value] of Object.entries(readAppValues(state))) {
    if (!isKeptValue(record.values[key])) continue;
    values[key] = value;
    if (record.values[key]) valueRecords[key] = record.values[key];
  }

  /* The areas inside this one */
  const areaIndex = record.areas.findIndex((area) => area.id === areaId);

  return {
    pathname: address.pathname,
    search: address.search,
    hash: address.hash,
    values,
    record: {
      values: valueRecords,
      areas: record.areas.slice(areaIndex + 1),
    },
  };
};

/** Steps restored into one entry: the top one takes it, the rest are virtual */
export const collapseSteps = (
  steps: StepRecord[],
  position: number,
): StepRecord[] =>
  steps.map((step, index) =>
    index === steps.length - 1
      ? { id: step.id, kind: step.kind, position }
      : { ...step, position: null },
  );

/** An inner area restored into one entry: its current step takes it, every other step is virtual */
const collapseArea = (
  area: AreaRecord,
  position: number,
): AreaRecord => {
  const saved: Record<string, StepRecord[]> = {};
  for (const [tab, steps] of Object.entries(area.saved)) {
    saved[tab] = steps.map((step) => ({ ...step, position: null }));
  }

  return {
    ...area,
    steps: collapseSteps(area.steps, position),
    saved,
    start: position,
  };
};

/** A saved step's record, restored into the entry at the position */
export const collapseSnapshot = (
  snapshot: StepSnapshot,
  position: number,
): EntryRecord => ({
  ...snapshot.record,
  areas: snapshot.record.areas.map((area) => collapseArea(area, position)),
});

/** An area keeps every step up to its current page, and the layers above it its values use */
export const pruneSteps = (
  area: AreaRecord,
  values: Record<string, ValueRecord>,
): AreaRecord => {
  const used = new Set<StepId>();

  for (const value of Object.values(values)) {
    if (value.area !== area.id) continue;
    if (value.first) used.add(value.first);
    if (value.latest) used.add(value.latest);
  }

  /* The current page's step: lower pages' layers stay as they are */
  const currentPage = area.steps.findLastIndex((step) => step.kind === "page");

  return {
    ...area,
    steps: area.steps.filter(
      (step, index) => index <= currentPage || used.has(step.id),
    ),
  };
};

/** A saved step stays when it's a page, or a layer whose own value its snapshot keeps */
const isKeptStep = (step: StepRecord) =>
  step.kind === "page" ||
  Object.values(step.snapshot?.record.values ?? {}).some(
    (value) => value.latest === step.id,
  );

/** Steps as saved: the current one snapshotted, and layers whose value isn't kept dropped */
export const saveSteps = (steps: StepRecord[], snapshot: StepSnapshot) => {
  const current = steps[steps.length - 1];
  if (!current) return [];

  /* The steps a tab keeps */
  const kept = [...steps.slice(0, -1), { ...current, snapshot }].filter(
    isKeptStep,
  );

  /* The highest one shows the current entry */
  const highest = kept[kept.length - 1];
  if (highest) kept[kept.length - 1] = { ...highest, snapshot };

  return kept;
};
