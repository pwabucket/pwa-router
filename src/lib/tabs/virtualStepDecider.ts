import type { Location } from "react-router";
import { readEntry } from "../engine/core/record";
import {
  isDefaultCollapsed,
  popToStep,
  showDefaultTab,
} from "./core/restoreSteps";
import { findFirstRealIndex } from "../engine/core/steps";
import { readStepPath } from "./core/tabs";
import type { MoveDecider } from "../engine/moveDeciders";

/** What a back out of a restored entry shows instead, in that entry */
interface RestoredStep {
  to: ReturnType<typeof readStepPath>;
  state: unknown;
}

/** The step a back out of a restored entry shows, from the innermost mounted area outwards */
const findRestoredStep = (
  from: Location,
  registeredAreas: ReadonlySet<string>,
): RestoredStep | undefined => {
  /* The entry's record */
  const { record } = readEntry(from.state);

  /* Each tabbed area, innermost first */
  for (let index = record.areas.length - 1; index > 0; index--) {
    const area = record.areas[index];

    /* An area whose TabsRoot isn't mounted has no tab behaviour */
    if (!registeredAreas.has(area.id)) continue;

    /* The area's first real step and its current step */
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

  /* No area shows a step instead */
  return undefined;
};

/** A decider undoing a back out of a restored tab's entry, to show its previous step there */
const createVirtualStepDecider =
  (registeredAreas: ReadonlySet<string>): MoveDecider =>
  ({ from, type, delta }) => {
    /* Only a single step back */
    if (type !== "POP" || delta !== -1) return undefined;

    /* The step to show instead, if any */
    const restored = findRestoredStep(from, registeredAreas);
    if (!restored) return undefined;

    /* Undo the back, then show the step */
    return {
      undo: "traverse",

      /* Show the step in the restored entry */
      onLanded: (moves) => moves.replace(restored.to, restored.state),
    };
  };

export { createVirtualStepDecider };
