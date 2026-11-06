import {
  type EntryRecord,
  findArea,
  readEntry,
  type StepId,
  writeRecord,
} from "./record";
import { findStepIndex, pruneSteps } from "./steps";

/** The position of a value's first or latest push, if it has an entry */
export const readValuePosition = (
  record: EntryRecord,
  key: string,
  push: "first" | "latest",
) => {
  const value = record.values[key];
  const area = value && findArea(record, value.area);
  if (!area) return undefined;

  const index = findStepIndex(area, value[push] as StepId | undefined);
  return area.steps[index]?.position ?? undefined;
};

/** The entry holds a set value that other pushes don't inherit */
export const isNonInheritedEntry = (state: unknown) => {
  const { state: values, record } = readEntry(state);
  return Object.entries(record.values).some(
    ([key, value]) => !value.inherit && values[key] != null,
  );
};

/** The set values that don't survive a reload */
export const readNonPersistentKeys = (state: unknown) => {
  const { state: values, record } = readEntry(state);
  return Object.keys(record.values).filter(
    (key) => !record.values[key].persist && values[key] != null,
  );
};

/** A state without the given values, their records, or the steps only they used */
export const removeValues = (state: unknown, keys: string[]) => {
  const { state: values, record } = readEntry(state);
  const nextValues = { ...values };
  const nextRecords = { ...record.values };

  for (const key of keys) {
    delete nextValues[key];
    delete nextRecords[key];
  }

  return writeRecord(nextValues, {
    ...record,
    values: nextRecords,
    areas: record.areas.map((area) => pruneSteps(area, nextRecords)),
  });
};

/** The pushed values (layers) of an entry */
const readLayerKeys = (state: unknown) => {
  const { state: values, record } = readEntry(state);
  return Object.keys(record.values).filter(
    (key) => record.values[key].latest !== undefined && values[key] != null,
  );
};

/** The entry holds layers pushed after the given position */
export const hasLayersAbove = (state: unknown, position: number) => {
  const { record } = readEntry(state);
  return readLayerKeys(state).some(
    (key) => (readValuePosition(record, key, "latest") ?? 0) > position,
  );
};
