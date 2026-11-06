import { useContext } from "react";
import { TabsContext } from "./TabsContext";
import { TabsEngineContext } from "./TabsEngineContext";
import { orderConfigs } from "./core/tabs";

/** A hook for the tabbed area exitTabs leaves: the nearest one, or the outermost registered */
const useExitArea = () => {
  const nearest = useContext(TabsContext);
  const engine = useContext(TabsEngineContext);

  return nearest?.config.id ?? orderConfigs(engine?.configs ?? [])[0]?.id;
};

export { useExitArea };
