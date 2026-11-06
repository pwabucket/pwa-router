import { createContext } from "react";

/** The area and tab a TabView shows */
interface TabViewPlace {
  area: string;
  tab: string;
}

/** Internal: the tab the reader sits in, when inside a TabView */
const TabViewContext = createContext<TabViewPlace | undefined>(undefined);

export { TabViewContext };
export type { TabViewPlace };
