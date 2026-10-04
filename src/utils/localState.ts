import { ROUTER_LOCAL_KEYS, routerState } from "../constants";
import { readEphemeralKeys } from "./ephemeralState";
import type { LocationState } from "./location";

/** Local (inherit: false) keys recorded in the state */
export const readLocalKeys = (state: LocationState) =>
  (state?.[ROUTER_LOCAL_KEYS] as string[] | undefined) ?? [];

/** State with every local value, its ephemeral mark and the key list removed */
export const removeLocalValues = (state: LocationState) => {
  const localKeys = readLocalKeys(state);
  const result = { ...state };
  const ephemeralKeys = { ...readEphemeralKeys(state) };

  for (const key of localKeys) {
    delete result[key];
    delete ephemeralKeys[key];
  }
  delete result[ROUTER_LOCAL_KEYS];

  return {
    ...result,
    ...(localKeys.length
      ? routerState.ephemeral(
          Object.keys(ephemeralKeys).length ? ephemeralKeys : undefined,
        )
      : {}),
  };
};

/** State patch recording `key` as local */
export const markLocal = (state: LocationState, key: string) =>
  routerState.local([
    ...readLocalKeys(state).filter((localKey) => localKey !== key),
    key,
  ]);

/** State patch removing `key` from the local key list */
export const unmarkLocal = (state: LocationState, key: string) => {
  const remainingKeys = readLocalKeys(state).filter(
    (localKey) => localKey !== key,
  );
  return routerState.local(remainingKeys.length ? remainingKeys : undefined);
};
