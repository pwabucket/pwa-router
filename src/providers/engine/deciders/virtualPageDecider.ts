import { readEntry } from "../../../core/legacy";
import { popToStep } from "../../../core/planTabs";
import { findFirstRealIndex } from "../../../core/steps";
import { readPagePath } from "../../../core/tabs";
import type { MoveDecider } from "./types";

/** The innermost tab area of a state when its current entry is a restored one with virtual pages below */
const readRestoredArea = (state: unknown) => {
  const { record } = readEntry(state);
  const area = record.areas[record.areas.length - 1];
  if (record.areas.length < 2) return undefined;

  /* The current step is the area's lowest real one, with virtual steps below */
  const firstReal = findFirstRealIndex(area);
  const isRestored = firstReal > 0 && firstReal === area.steps.length - 1;

  return isRestored ? { area, record, firstReal } : undefined;
};

/** A decider undoing a back out of a restored tab's entry, to show its previous page there */
const virtualPageDecider: MoveDecider = ({ from, type, delta }) => {
  if (type !== "POP" || delta !== -1) return undefined;

  const restored = readRestoredArea(from.state);
  if (!restored) return undefined;

  return {
    undo: "traverse",

    /* Show the tab's previous page in the restored entry */
    onLanded: (navigate) => {
      const { area, record, firstReal } = restored;
      const page = area.steps[firstReal - 1];
      const position = area.steps[firstReal].position!;

      navigate(readPagePath(page), {
        replace: true,
        state: popToStep(area, record, page.id, position),
      });
    },
  };
};

export { virtualPageDecider };
