import {
  type AreaRecord,
  type EntryRecord,
  type StepRecord,
  writeRecord,
} from "../../../engine/core/record";
import { collapseSnapshot, pruneSteps } from "../../../engine/core/steps";
import type { TabDefinition } from "./config";

/** The address of a saved step */
export const readStepPath = (step: StepRecord) => ({
  pathname: step.snapshot?.pathname ?? "/",
  search: step.snapshot?.search ?? "",
  hash: step.snapshot?.hash ?? "",
});

/** A tab's first page, as a new page step: its root, or the area's address */
export const rootPageStep = (
  tab: TabDefinition,
  area: Pick<AreaRecord, "address">,
  id: string,
): StepRecord => {
  /* The tab's root, or the area's address */
  const address =
    tab.root === undefined
      ? area.address
      : { pathname: tab.root, search: "", hash: "" };

  /* A page step with no entry yet, showing that address */
  return {
    id,
    kind: "page",
    position: null,
    snapshot: {
      pathname: address?.pathname ?? "/",
      search: address?.search ?? "",
      hash: address?.hash ?? "",
      values: {},
      record: { values: {}, areas: [] },
    },
  };
};

/** The state of an entry showing a saved step, in the given tab area */
export const buildStepState = (
  step: StepRecord,
  area: AreaRecord,
  outerRecord: EntryRecord,
  position: number,
) => {
  /* The step's snapshot, collapsed into the entry at the position */
  const snapshot = step.snapshot;
  const restored = snapshot
    ? collapseSnapshot(snapshot, position)
    : { values: {}, areas: [] };

  /* The areas around this one, keeping only the steps the step's values use */
  const index = outerRecord.areas.findIndex(
    (candidate) => candidate.id === area.id,
  );
  const outerAreas = (
    index < 0 ? outerRecord.areas : outerRecord.areas.slice(0, index)
  ).map((outer) => pruneSteps(outer, restored.values));

  /* The step's values, with the outer areas, this area and the step's inner areas */
  return writeRecord(snapshot?.values ?? {}, {
    values: restored.values,
    areas: [...outerAreas, area, ...restored.areas],
  });
};
