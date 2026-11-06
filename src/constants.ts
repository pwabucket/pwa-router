/** The prefix of every key the router keeps in history state */
export const ROUTER_KEY_PREFIX = "__router";

/** The engine's record, on every entry */
export const ROUTER_RECORD = "__router";

/** The leave guard whose question is open */
export const ROUTER_GUARD = "__router_guard";

/** Go back by this delta first, then re-apply the location from there */
export const ROUTER_FROM_POSITION = "__router_from_position";

/** Push an entry to drop forward history, then jump to this index */
export const ROUTER_DESTROY_INDEX = "__router_destroy_index";

/** Jump to the entry before this stamped index */
export const ROUTER_NAVIGATE_INDEX = "__router_navigate_index";

/** Root element attribute holding the engine's status, set by RouterStatusProbe */
export const ROUTER_STATUS_ATTRIBUTE = "data-pwa-router-correcting";

/** A state marker going back by the delta before applying the navigation */
export const fromPosition = (value?: number) => ({
  [ROUTER_FROM_POSITION]: value,
});

/** A state marker dropping forward history, then landing before the index */
export const destroyIndex = (value?: number) => ({
  [ROUTER_DESTROY_INDEX]: value,
});

/** A state marker landing before the index */
export const navigateIndex = (value?: number) => ({
  [ROUTER_NAVIGATE_INDEX]: value,
});

/** The state markers, to spread into a navigation's state */
export const routerState = {
  from: fromPosition,
  destroy: destroyIndex,
  navigate: navigateIndex,
};
