import { isProduction } from "../utils/environment";
import type { TabsConfig } from "./core/tabs";

/** Warns, in development, about duplicate tab ids or an unknown default tab */
export const warnInvalidTabs = ({ id, tabs, defaultTab }: TabsConfig) => {
  if (isProduction()) return;

  /* Duplicate ids */
  const ids = tabs.map((tab) => tab.id);
  const duplicates = ids.filter((tabId, index) => ids.indexOf(tabId) !== index);
  if (duplicates.length) {
    console.warn(
      `[pwa-router] TabsRoot "${id}" has duplicate tab ids: ${duplicates.join(", ")}.`,
    );
  }

  /* Unknown default */
  if (!ids.includes(defaultTab)) {
    console.warn(
      `[pwa-router] TabsRoot "${id}" has no tab "${defaultTab}" for its defaultTab.`,
    );
  }
};

/** Warns, in development, when a tab that isn't active tries to change location state */
export const warnHiddenTabChange = (key: string) => {
  if (isProduction()) return;

  console.warn(
    `[pwa-router] A tab that isn't active tried to change "${key}"; it can't until it is selected.`,
  );
};
