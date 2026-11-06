// ==============================
// Internal Keys (do not change)
// ==============================
/** Go back by this delta first, then re-apply the location from there */
export const ROUTER_FROM_POSITION = "__router_from_position";
/** Push an entry to drop forward history, then jump to this index */
export const ROUTER_DESTROY_INDEX = "__router_destroy_index";
/** Jump to the entry before this stamped index */
export const ROUTER_NAVIGATE_INDEX = "__router_navigate_index";
/** The leave guard whose question is open */
export const ROUTER_GUARD = "__router_guard";
/** The tabbed area data of an entry, written by the engine */
export const ROUTER_TABS = "__router_tabs";
/** Where each value was pushed, stamped by the engine */
export const ROUTER_LAYERS = "__router_layers";
/** Keys set with persist: false, discarded after a reload */
export const ROUTER_EPHEMERAL_KEYS = "__router_ephemeral_keys";
/** Keys set with inherit: false, dropped from entries pushed by other keys */
export const ROUTER_NON_INHERITED_KEYS = "__router_non_inherited_keys";

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

export const ephemeralKeys = (value?: string[]) => ({
  [ROUTER_EPHEMERAL_KEYS]: value,
});

export const nonInheritedKeys = (value?: string[]) => ({
  [ROUTER_NON_INHERITED_KEYS]: value,
});

// ==============================
// Composable Namespace (recommended)
// ==============================

export const routerState = {
  from: fromPosition,
  destroy: destroyIndex,
  navigate: navigateIndex,
  ephemeral: ephemeralKeys,
  nonInherited: nonInheritedKeys,
};

/**
 * Usage:
 * navigate("/route", {
 *   state: { ...routerState.from(-1), ...routerState.destroy(3) },
 * });
 */
