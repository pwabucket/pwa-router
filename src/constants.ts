// ==============================
// Internal Keys (do not change)
// ==============================
export const ROUTER_FROM_POSITION = "__router_from_position";
export const ROUTER_DESTROY_INDEX = "__router_destroy_index";
export const ROUTER_NAVIGATE_INDEX = "__router_navigate_index";
export const ROUTER_INDEX_PREFIX = "__router_index_";

// ==============================
// DX-Friendly Helpers
// ==============================

/**
 * Single-flag helpers (quick use)
 */
export const fromPosition = (value: number) => ({
  [ROUTER_FROM_POSITION]: value,
});

export const destroyIndex = (value: number) => ({
  [ROUTER_DESTROY_INDEX]: value,
});

export const navigateIndex = (value: number) => ({
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
 * Usage Examples:
 *
 * Single flag:
 * navigate("/route", { state: { ...fromPosition(-1) } });
 *
 * Multiple flags (composable):
 * navigate("/route", {
 *   state: {
 *     ...routerState.from(-1),
 *     ...routerState.destroy(3),
 *   }
 * });
 *
 * Full clarity + IDE autocomplete:
 * routerState.from(-1)
 * routerState.destroy(2)
 * routerState.navigate(5)
 */
