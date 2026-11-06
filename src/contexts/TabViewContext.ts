import { createContext } from "react";

/** Internal: the tab the reader sits in, when inside a TabView */
const TabViewContext = createContext<string | undefined>(undefined);

export { TabViewContext };
