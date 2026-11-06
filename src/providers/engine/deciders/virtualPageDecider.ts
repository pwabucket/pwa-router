import { ROUTER_TABS } from "../../../constants";
import type { LocationState } from "../../../utils/location";
import {
  pageEntryState,
  pagePath,
  type TabsEntryState,
} from "../../../utils/tabs";
import type { MoveDecider } from "./types";

/** The tabs data of a tab's first entry that still has virtual pages below it */
const readVirtualSlot = (state: LocationState) => {
  const tabs = state?.[ROUTER_TABS] as TabsEntryState | undefined;
  const hasVirtualPages =
    tabs !== undefined &&
    tabs.virtual > 0 &&
    tabs.stamp === tabs.slot &&
    tabs.pages.length === tabs.virtual;

  return hasVirtualPages ? tabs : undefined;
};

/** A decider undoing a back out of a restored tab's entry, to show its previous page there */
const virtualPageDecider: MoveDecider = ({ from, type, delta }) => {
  if (type !== "POP" || delta !== -1) return undefined;

  const tabs = readVirtualSlot(from.state);
  if (!tabs) return undefined;

  return {
    undo: "traverse",

    /* Show the tab's previous page in the restored entry */
    onLanded: (navigate) => {
      const page = tabs.pages[tabs.pages.length - 1];

      navigate(pagePath(page), {
        replace: true,
        state: pageEntryState(page, {
          ...tabs,
          pages: tabs.pages.slice(0, -1),
          virtual: tabs.virtual - 1,
        }),
      });
    },
  };
};

export { virtualPageDecider };
