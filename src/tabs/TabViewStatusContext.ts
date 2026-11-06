import { createContext } from "react";

/** The tab a TabView shows, and whether it is the active one */
interface TabViewStatus {
  tab: string;
  /** The tab is selected (including one being switched to) */
  isActive: boolean;
}

/** Internal: the status of the TabView the reader sits in */
const TabViewStatusContext = createContext<TabViewStatus | null>(null);

export { TabViewStatusContext };
export type { TabViewStatus };
