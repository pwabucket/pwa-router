import { useContext } from "react";
import { TabsContext } from "../../contexts/tabs/TabsContext";
import { TabsEngineContext } from "../../contexts/tabs/TabsEngineContext";
import { orderConfigs } from "../../lib/tabs/core/tabs";

/** A hook for the tabbed area exitTabs leaves: the nearest one, or the outermost registered */
const useExitArea = () => {
  /* The nearest tabbed area and the tabs engine */
  const nearest = useContext(TabsContext);
  const engine = useContext(TabsEngineContext);

  /* The nearest area's id, or the outermost registered one's */
  return nearest?.config.id ?? orderConfigs(engine?.configs ?? [])[0]?.id;
};

export { useExitArea };
