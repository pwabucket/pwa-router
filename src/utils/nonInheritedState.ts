import { ROUTER_NON_INHERITED_KEYS, routerState } from "../constants";
import { readEphemeralKeys } from "./ephemeralState";
import { removeLayers } from "./layers";
import type { LocationState } from "./location";

/** Non-inherited (inherit: false) keys recorded in the state */
export const readNonInheritedKeys = (state: LocationState) =>
  (state?.[ROUTER_NON_INHERITED_KEYS] as string[] | undefined) ?? [];

/** Entries holding non-inherited values are replaced by the next push */
export const isNonInheritedEntry = (state: LocationState) =>
  readNonInheritedKeys(state).length > 0;

/** State with every non-inherited value, its ephemeral mark, its stamp and the key list removed */
export const removeNonInheritedValues = (state: LocationState) => {
  const nonInheritedKeys = readNonInheritedKeys(state);
  const inheritedState = { ...state };

  /* Nothing to remove */
  if (!nonInheritedKeys.length) return inheritedState;

  /* Drop the values and the key list */
  for (const key of nonInheritedKeys) delete inheritedState[key];
  delete inheritedState[ROUTER_NON_INHERITED_KEYS];

  /* The ephemeral keys that remain */
  const ephemeralKeys = readEphemeralKeys(state).filter(
    (key) => !nonInheritedKeys.includes(key),
  );

  return {
    ...inheritedState,
    ...routerState.ephemeral(ephemeralKeys.length ? ephemeralKeys : undefined),
    ...removeLayers(state, nonInheritedKeys),
  };
};

/** State patch recording `key` as non-inherited */
export const markNonInherited = (state: LocationState, key: string) =>
  routerState.nonInherited([
    ...readNonInheritedKeys(state).filter(
      (nonInheritedKey) => nonInheritedKey !== key,
    ),
    key,
  ]);

/** State patch removing `key` from the non-inherited key list */
export const unmarkNonInherited = (state: LocationState, key: string) => {
  const remainingKeys = readNonInheritedKeys(state).filter(
    (nonInheritedKey) => nonInheritedKey !== key,
  );
  return routerState.nonInherited(
    remainingKeys.length ? remainingKeys : undefined,
  );
};
