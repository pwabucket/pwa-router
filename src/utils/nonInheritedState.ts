import { ROUTER_NON_INHERITED_KEYS, routerState } from "../constants";
import { readEphemeralKeys } from "./ephemeralState";
import type { LocationState } from "./location";

/** Non-inherited (inherit: false) keys recorded in the state */
export const readNonInheritedKeys = (state: LocationState) =>
  (state?.[ROUTER_NON_INHERITED_KEYS] as string[] | undefined) ?? [];

/** State with every non-inherited value, its ephemeral mark and the key list removed */
export const removeNonInheritedValues = (state: LocationState) => {
  const nonInheritedKeys = readNonInheritedKeys(state);
  const inheritedState = { ...state };
  const ephemeralKeys = { ...readEphemeralKeys(state) };

  for (const key of nonInheritedKeys) {
    delete inheritedState[key];
    delete ephemeralKeys[key];
  }
  delete inheritedState[ROUTER_NON_INHERITED_KEYS];

  return {
    ...inheritedState,
    ...(nonInheritedKeys.length
      ? routerState.ephemeral(
          Object.keys(ephemeralKeys).length ? ephemeralKeys : undefined,
        )
      : {}),
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
