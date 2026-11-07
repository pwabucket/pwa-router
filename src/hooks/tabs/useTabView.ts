import { useContext } from "react";
import {
  TabViewStatusContext,
  type TabViewStatus,
} from "../../contexts/tabs/TabViewStatusContext";

/** A hook for the nearest TabView: its tab and whether it is active; null outside one */
const useTabView = (): TabViewStatus | null =>
  useContext(TabViewStatusContext);

export { useTabView };
