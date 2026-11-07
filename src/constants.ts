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
/** Keys set with inherit: false, dropped from entries pushed by other keys */
export const ROUTER_NON_INHERITED_KEYS = "__router_non_inherited_keys";

// ==============================
// DX-Friendly Helpers
// ==============================

/** A state patch asking to go back by `value` first, then re-apply the navigation */
export const fromPosition = (value?: number) => ({
  [ROUTER_FROM_POSITION]: value,
});

/** A state patch asking to push, then go back to before the stamped `value` */
export const destroyIndex = (value?: number) => ({
  [ROUTER_DESTROY_INDEX]: value,
});

/** A state patch asking to go back to before the stamped `value` */
export const navigateIndex = (value?: number) => ({
  [ROUTER_NAVIGATE_INDEX]: value,
});

/** Ephemeral state key → index key to return to (null to go back once) */
export type EphemeralKeyMap = Record<string, string | null>;

/** A state patch recording the ephemeral keys */
export const ephemeralKeys = (value?: EphemeralKeyMap) => ({
  [ROUTER_EPHEMERAL_KEYS]: value,
});

/** A state patch recording the non-inherited keys */
export const nonInheritedKeys = (value?: string[]) => ({
  [ROUTER_NON_INHERITED_KEYS]: value,
});

// ==============================
// Composable Namespace (recommended)
// ==============================

/** Every state patch, by name */
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
