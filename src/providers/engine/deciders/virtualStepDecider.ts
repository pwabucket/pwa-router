import type { Location } from "react-router";
import { readEntry } from "../../../core/record";
import {
  isDefaultCollapsed,
  popToStep,
  showDefaultTab,
} from "../../../core/planTabs";
import { findFirstRealIndex } from "../../../core/steps";
import { readStepPath } from "../../../core/tabs";
import type { MoveDecider } from "./types";

/** What a back out of a restored entry shows instead, in that entry */
interface RestoredStep {
  to: ReturnType<typeof readStepPath>;
  state: unknown;
}

/** The step a back out of a restored entry shows, from the innermost area outwards */
const findRestoredStep = (from: Location): RestoredStep | undefined => {
  const { record } = readEntry(from.state);

  for (let index = record.areas.length - 1; index > 0; index--) {
    const area = record.areas[index];
    const firstReal = findFirstRealIndex(area);
    const current = area.steps.length - 1;

    /* Real entries above: back is an ordinary back */
    if (firstReal !== current) return undefined;

    /* Virtual steps below this entry: show the one below */
    const position = area.steps[firstReal].position!;

    if (firstReal > 0) {
      const below = area.steps[firstReal - 1];
      return {
        to: readStepPath(below),
        state: popToStep(area, record, below.id, position),
      };
    }

    /* The tab's root after a restore: show the default tab */
    if (isDefaultCollapsed(area, position)) {
      const steps = area.saved[area.defaultTab];
      return {
        to: readStepPath(steps[steps.length - 1]),
        state: showDefaultTab(area, record, from, position),
      };
    }

    /* This area only holds this entry: look at the area around it */
  }

  return undefined;
};

/** A decider undoing a back out of a restored tab's entry, to show its previous step there */
const virtualStepDecider: MoveDecider = ({ from, type, delta }) => {
  if (type !== "POP" || delta !== -1) return undefined;

  const restored = findRestoredStep(from);
  if (!restored) return undefined;

  return {
    undo: "traverse",

    /* Show the step in the restored entry */
    onLanded: (navigate) =>
      navigate(restored.to, { replace: true, state: restored.state }),
  };
};

export { virtualStepDecider };
