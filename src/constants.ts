// ==============================
// Internal Keys (do not change)
// ==============================
/** Go back by this delta first, then re-apply the location from there */
export const ROUTER_FROM_POSITION = "__router_from_position";
/** Push an entry to drop forward history, then jump to this index */
export const ROUTER_DESTROY_INDEX = "__router_destroy_index";
/** Jump to the entry before this stamped index */
export const ROUTER_NAVIGATE_INDEX = "__router_navigate_index";

/** Root element attribute holding the engine's status, set by RouterStatusProbe */
export const ROUTER_STATUS_ATTRIBUTE = "data-pwa-router-correcting";

// ==============================
// DX-Friendly Helpers
// ==============================

/**
 * Single-flag helpers (quick use)
 */
export const fromPosition = (value?: number) => ({
  [ROUTER_FROM_POSITION]: value,
});

export const destroyIndex = (value?: number) => ({
  [ROUTER_DESTROY_INDEX]: value,
});

export const navigateIndex = (value?: number) => ({
  [ROUTER_NAVIGATE_INDEX]: value,
});

// ==============================
// Composable Namespace (recommended)
// ==============================

export const routerState = {
  from: fromPosition,
  destroy: destroyIndex,
  navigate: navigateIndex,
};

/**
 * Usage:
 * navigate("/route", {
 *   state: { ...routerState.from(-1), ...routerState.destroy(3) },
 * });
 */
