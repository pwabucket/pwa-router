import type { Location } from "react-router";
import { readEntry } from "../../../core/record";
import {
  isDefaultCollapsed,
  popToStep,
  showDefaultTab,
} from "../../../core/planTabs";
import { findFirstRealIndex } from "../../../core/steps";
import { readPagePath } from "../../../core/tabs";
import type { MoveDecider } from "./types";

/** What a back out of a restored entry shows instead, in that entry */
interface RestoredPage {
  to: ReturnType<typeof readPagePath>;
  state: unknown;
}

/** The page a back out of a restored entry shows, from the innermost area outwards */
const findRestoredPage = (from: Location): RestoredPage | undefined => {
  const { record } = readEntry(from.state);

  for (let index = record.areas.length - 1; index > 0; index--) {
    const area = record.areas[index];
    const firstReal = findFirstRealIndex(area);
    const current = area.steps.length - 1;

    /* Real entries above: back is an ordinary back */
    if (firstReal !== current) return undefined;

    /* Virtual pages below this entry: show the one below */
    const position = area.steps[firstReal].position!;

    if (firstReal > 0) {
      const page = area.steps[firstReal - 1];
      return {
        to: readPagePath(page),
        state: popToStep(area, record, page.id, position),
      };
    }

    /* The tab's root after a restore: show the default tab */
    if (isDefaultCollapsed(area, position)) {
      const pages = area.saved[area.defaultTab];
      return {
        to: readPagePath(pages[pages.length - 1]),
        state: showDefaultTab(area, record, from, position),
      };
    }

    /* This area only holds this entry: look at the area around it */
  }

  return undefined;
};

/** A decider undoing a back out of a restored tab's entry, to show its previous page there */
const virtualPageDecider: MoveDecider = ({ from, type, delta }) => {
  if (type !== "POP" || delta !== -1) return undefined;

  const restored = findRestoredPage(from);
  if (!restored) return undefined;

  return {
    undo: "traverse",

    /* Show the page in the restored entry */
    onLanded: (navigate) =>
      navigate(restored.to, { replace: true, state: restored.state }),
  };
};

export { virtualPageDecider };
