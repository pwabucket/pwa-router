import type { NavigateOptions } from "react-router";
import {
  innermostArea,
  updateArea,
  withoutRecord,
  writeRecord,
  type EntryRecord,
  type StepId,
  type ValueRecord,
} from "./record";
import {
  createStep,
  findCloseTarget,
  findStepIndex,
  pruneSteps,
  type CloseTarget,
} from "./steps";

/** Options for setting a value */
export interface ValueChangeOptions extends NavigateOptions {
  /** When clearing, go back before the value's first push instead of its latest */
  toStart?: boolean;
}

/** A queued change to one location state value */
export interface ValueChange {
  key: string;
  /** The new value; undefined clears it */
  value: unknown;
  persist: boolean;
  inherit: boolean;
  /** Update the current entry in place instead of pushing */
  replace: boolean;
  options?: ValueChangeOptions;
}

/** The current entry the changes are planned from */
export interface PlanEntry {
  key: string;
  /** The full location state: app values and the record */
  state: Record<string, unknown>;
  record: EntryRecord;
}

/** Nothing to navigate */
export interface NonePlan {
  kind: "none";
}

/** Close the cleared values, then apply the rest where it lands */
export interface ClosePlan {
  kind: "close";
  keys: string[];
  target: CloseTarget;
  followUps: ValueChange[];
}

/** A step to position once its push lands */
export interface PositionStep {
  area: string;
  step: StepId;
}

/** In-place values first, then one push or replace */
export interface WritePlan {
  kind: "write";
  replace: boolean;
  state: Record<string, unknown>;
  /** The current entry's state to write in place before pushing */
  inPlaceState?: Record<string, unknown>;
  /** The pushed step, positioned once it lands */
  position?: PositionStep;
  options: NavigateOptions;
}

export type ChangesPlan = NonePlan | ClosePlan | WritePlan;

/** The change updates the current entry in place */
const isInPlace = (change: ValueChange) =>
  change.replace || change.options?.replace === true;

/** The entry a close target lands on, to compare targets */
const landingEntry = (target: CloseTarget) => {
  if (target.kind === "land") return target.before - 1;
  if (target.kind === "virtualPop") return target.position;
  return Infinity;
};

/** Plans a close of every cleared value: the lowest landing wins */
const planClose = (
  entry: PlanEntry,
  changes: ValueChange[],
  closes: ValueChange[],
): ClosePlan => {
  const targets = closes.map((change) =>
    findCloseTarget(entry.record, change.key, change.options?.toStart === true),
  );

  /* The lowest landing closes everything above it */
  const recorded = targets.filter((target) => target.kind !== "back");
  const target = recorded.length
    ? recorded.reduce((lowest, candidate) =>
        landingEntry(candidate) < landingEntry(lowest) ? candidate : lowest,
      )
    : ({ kind: "back" } as const);

  return {
    kind: "close",
    keys: closes.map((change) => change.key),
    target,
    followUps: changes.filter((change) => !closes.includes(change)),
  };
};

/** Values and records after a set of changes, and their navigation options */
const applyChanges = (
  values: Record<string, unknown>,
  record: EntryRecord,
  changes: ValueChange[],
  pushedStep: StepId | undefined,
) => {
  const nextValues = { ...values };
  const nextRecords: Record<string, ValueRecord> = { ...record.values };
  const areaId = innermostArea(record).id;
  let options: NavigateOptions = {};

  for (const change of changes) {
    /* Navigation options, the latest change winning */
    const { state: statePatch, replace: _, toStart: __, ...rest } =
      change.options ?? {};
    options = { ...options, ...rest };

    /* The value with its state patch (public markers included, the record not) */
    Object.assign(nextValues, withoutRecord(statePatch), {
      [change.key]: change.value,
    });

    /* Its record: a push points at the pushed step, in place keeps its steps */
    const previous = nextRecords[change.key];
    const isPush = pushedStep !== undefined && !isInPlace(change);

    nextRecords[change.key] = {
      area: previous?.area ?? areaId,
      first: isPush ? (previous?.first ?? pushedStep) : previous?.first,
      latest: isPush ? pushedStep : previous?.latest,
      persist: change.persist,
      inherit: change.inherit,
    };
  }

  /* Unset values lose their records */
  for (const key of Object.keys(nextRecords)) {
    if (nextValues[key] == null) {
      delete nextRecords[key];
      delete nextValues[key];
    }
  }

  return { values: nextValues, records: nextRecords, options };
};

/** Values and records without the non-inherited ones */
const dropNonInherited = (
  values: Record<string, unknown>,
  record: EntryRecord,
) => {
  const nextValues = { ...values };
  const nextRecords = { ...record.values };

  for (const [key, value] of Object.entries(record.values)) {
    if (value.inherit) continue;
    delete nextValues[key];
    delete nextRecords[key];
  }

  return { values: nextValues, record: { ...record, values: nextRecords } };
};

/** The step of the entry's non-inherited values, which a push takes over */
const findReplacedStep = (record: EntryRecord) => {
  const area = innermostArea(record);
  let replaced: StepId | undefined;
  let replacedIndex = -1;

  for (const value of Object.values(record.values)) {
    if (value.inherit || value.area !== area.id) continue;
    const index = findStepIndex(area, value.latest);
    if (index > replacedIndex) {
      replaced = value.latest;
      replacedIndex = index;
    }
  }

  return replaced;
};

/** A full state from values and their records, dropping layer steps no value points at */
const buildState = (
  values: Record<string, unknown>,
  record: EntryRecord,
  records: Record<string, ValueRecord>,
) =>
  writeRecord(values, {
    ...record,
    values: records,
    areas: record.areas.map((area) => pruneSteps(area, records)),
  });

/** Plans the writes: in-place values first, then one push or replace */
const planWrite = (
  entry: PlanEntry,
  changes: ValueChange[],
  newStepId: () => StepId,
): WritePlan => {
  const values = withoutRecord(entry.state);

  /* Values that add an entry, and values updated in place */
  const pushes = changes.filter(
    (change) => change.value !== undefined && !isInPlace(change),
  );
  const inPlaceChanges = changes.filter((change) => !pushes.includes(change));

  /* The current entry with the in-place values */
  const current = applyChanges(values, entry.record, inPlaceChanges, undefined);
  const currentState = buildState(
    current.values,
    entry.record,
    current.records,
  );

  if (!pushes.length) {
    return {
      kind: "write",
      replace: true,
      state: currentState,
      options: current.options,
    };
  }

  /* A push from an entry holding non-inherited values takes its place (a swap) */
  const replacedStep = findReplacedStep(entry.record);
  const currentRecord = { ...entry.record, values: current.records };
  const inherited = dropNonInherited(current.values, currentRecord);

  /* The pushed step: a new one, or the replaced entry's */
  const stepId = replacedStep ?? newStepId();
  const areaId = innermostArea(entry.record).id;
  const pushedRecord = replacedStep
    ? inherited.record
    : updateArea(inherited.record, areaId, (area) => ({
        ...area,
        steps: [...area.steps, createStep(stepId, "layer")],
      }));

  const pushed = applyChanges(inherited.values, pushedRecord, pushes, stepId);
  const options = { ...current.options, ...pushed.options };
  const state = buildState(pushed.values, pushedRecord, pushed.records);

  if (replacedStep) {
    return { kind: "write", replace: true, state, options };
  }

  return {
    kind: "write",
    replace: false,
    state,
    inPlaceState: inPlaceChanges.length ? currentState : undefined,
    position: { area: areaId, step: stepId },
    options,
  };
};

/** Plans the single navigation for every change queued in one tick */
export const planChanges = (
  entry: PlanEntry,
  queued: ValueChange[],
  newStepId: () => StepId,
): ChangesPlan => {
  /* Changes that differ from the entry */
  const changes = queued.filter(
    (change) => !Object.is(change.value, entry.state[change.key]),
  );

  if (!changes.length) return { kind: "none" };

  /* Cleared pushed values close first */
  const closes = changes.filter(
    (change) => change.value === undefined && !isInPlace(change),
  );

  return closes.length
    ? planClose(entry, changes, closes)
    : planWrite(entry, changes, newStepId);
};

/** A state with a pushed step given its entry's position */
export const positionPushedStep = (
  state: Record<string, unknown>,
  record: EntryRecord,
  { area, step }: PositionStep,
  position: number,
) =>
  writeRecord(
    state,
    updateArea(record, area, (current) => ({
      ...current,
      steps: current.steps.map((candidate) =>
        candidate.id === step ? { ...candidate, position } : candidate,
      ),
    })),
  );
