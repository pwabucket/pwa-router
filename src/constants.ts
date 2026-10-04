// ==============================
// Internal Keys (do not change)
// ==============================
/** Go back by this delta first, then re-apply the location from there */
export const ROUTER_FROM_POSITION = "__router_from_position";
/** Push an entry to drop forward history, then jump to this index */
export const ROUTER_DESTROY_INDEX = "__router_destroy_index";
/** Jump to the entry before this stamped index */
export const ROUTER_NAVIGATE_INDEX = "__router_navigate_index";
/** Prefix for history indexes stamped by useLocationIndexUpdater */
export const ROUTER_INDEX_PREFIX = "__router_index_";
/** Keys set with persist: false, discarded after a reload */
export const ROUTER_EPHEMERAL_KEYS = "__router_ephemeral_keys";

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

/** Ephemeral state key → index key to return to (null to go back once) */
export type EphemeralKeyMap = Record<string, string | null>;

export const ephemeralKeys = (value?: EphemeralKeyMap) => ({
  [ROUTER_EPHEMERAL_KEYS]: value,
});

// ==============================
// Composable Namespace (recommended)
// ==============================

export const routerState = {
  from: fromPosition,
  destroy: destroyIndex,
  navigate: navigateIndex,
  ephemeral: ephemeralKeys,
};

/**
 * Usage:
 * navigate("/route", {
 *   state: { ...routerState.from(-1), ...routerState.destroy(3) },
 * });
 */
