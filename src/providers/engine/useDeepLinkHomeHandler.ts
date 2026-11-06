import { useEffect, useRef } from "react";
import { useNavigate, type Location, type To } from "react-router";
import { readHistoryIndex } from "../../utils/history";
import { getLocationPath } from "../../utils/location";
import type { TabsConfig, TabsEntryState } from "../../utils/tabs";
import { planBackfill } from "../../utils/tabsPlan";

/** Events that give the page a user activation */
const ACTIVATION_EVENTS = ["click", "keydown"] as const;

/** The tabbed area, when one is registered */
interface DeepLinkTabs {
  config: TabsConfig | null;
  tabs: TabsEntryState | undefined;
}

/** An entry to write under (and as) the first entry */
interface BackfillEntry {
  to: To;
  state: unknown;
}

/** The entries to put under the app's first entry, or null when none are needed */
const planEntries = (
  homePath: string | undefined,
  location: Location,
  { config, tabs }: DeepLinkTabs,
): BackfillEntry[] | null => {
  if (readHistoryIndex() !== 0) return null;

  /* A tabbed area's first entry: the default root and the tab's root go below */
  if (config) {
    return tabs && tabs.stamp === tabs.base
      ? planBackfill(config, location, tabs)
      : null;
  }

  /* A fresh inner page: home goes below */
  const isFreshInnerEntry =
    homePath !== undefined &&
    location.key === "default" &&
    location.pathname !== homePath;

  return isFreshInnerEntry
    ? [
        { to: homePath, state: undefined },
        { to: getLocationPath(location), state: location.state },
      ]
    : null;
};

/** Puts the home page (or a tabbed area's roots) under an inner page the app was first opened on */
const useDeepLinkHomeHandler = (
  homePath: string | undefined,
  location: Location,
  isCorrecting: boolean,
  tabs: DeepLinkTabs,
  holdUntilLanding: () => void,
) => {
  const navigate = useNavigate();
  const hasTabs = tabs.config !== null;

  /* The latest inputs, read on activation */
  const latestRef = useRef({
    location,
    isCorrecting,
    navigate,
    tabs,
    holdUntilLanding,
  });

  // oxlint-disable-next-line react/refs
  latestRef.current = {
    location,
    isCorrecting,
    navigate,
    tabs,
    holdUntilLanding,
  };

  useEffect(() => {
    if (!homePath && !hasTabs) return;
    if (readHistoryIndex() !== 0) return;

    /** Writes the entries below the page, during the user's first activation */
    const backfill = () => {
      const { location, isCorrecting, navigate, tabs, holdUntilLanding } =
        latestRef.current;
      if (isCorrecting) return;

      removeListeners();
      const entries = planEntries(homePath, location, tabs);
      if (!entries) return;

      /* Work queued by this activation waits for the new entries */
      holdUntilLanding();

      /* The first entry becomes the lowest page; the rest are pushed */
      const [first, ...rest] = entries;
      navigate(first.to, { replace: true, state: first.state });
      for (const entry of rest) navigate(entry.to, { state: entry.state });
    };

    /** Stops waiting for an activation */
    const removeListeners = () => {
      for (const type of ACTIVATION_EVENTS) {
        window.removeEventListener(type, backfill, true);
      }
    };

    /* Wait for an activation, so the browser never skips the entries below */
    for (const type of ACTIVATION_EVENTS) {
      window.addEventListener(type, backfill, true);
    }

    return removeListeners;
  }, [homePath, hasTabs]);
};

export { useDeepLinkHomeHandler };
