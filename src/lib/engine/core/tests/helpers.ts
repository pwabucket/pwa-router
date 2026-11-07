import {
  ROOT_AREA,
  createArea,
  createRecord,
  type AreaRecord,
  type EntryRecord,
  type StepRecord,
} from "../record";

/** A step with an entry at the position, or virtual (null) */
export const step = (
  id: string,
  position: number | null,
  kind: StepRecord["kind"] = "layer",
): StepRecord => ({ id, kind, position });

/** A tab area with the given steps */
export const tabArea = (
  steps: StepRecord[],
  overrides: Partial<AreaRecord> = {},
): AreaRecord => ({
  ...createArea("tabs", "search", 1, 0),
  steps,
  ...overrides,
});

/** A record with root steps and value records */
export const rootRecord = (
  steps: StepRecord[],
  values: EntryRecord["values"] = {},
): EntryRecord => {
  const record = createRecord();
  return {
    ...record,
    values,
    areas: [{ ...record.areas[0], steps }],
  };
};

/** A pushed root value's record */
export const pushedValue = (first: string, latest = first) => ({
  area: ROOT_AREA,
  first,
  latest,
  persist: true,
  inherit: true,
});

/** A step id generator returning s1, s2… */
export const stepIds = () => {
  let count = 0;
  return () => `s${++count}`;
};
