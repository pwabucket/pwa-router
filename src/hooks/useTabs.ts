import { useContext, useMemo } from "react";
import { TabsContext } from "../contexts/TabsContext";

/** Controls of the nearest tabbed area */
interface TabsControls {
  /** The tab on show */
  active: string;
  /** Switches to a tab; the active one pops to its root */
  select: (tab: string) => void;
  /** Pops the active tab to its root */
  popToRoot: () => void;
}

/** A hook for the nearest tabbed area: the tab on show, and switching tabs */
const useTabs = (): TabsControls => {
  const { active, select, popToRoot } = useContext(TabsContext)!;

  return useMemo(
    () => ({ active, select, popToRoot }),
    [active, select, popToRoot],
  );
};

export { useTabs };
export type { TabsControls };
