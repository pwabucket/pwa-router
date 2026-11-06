import { ROUTER_EPHEMERAL_KEYS, routerState } from "../constants";
import type { LocationState } from "./location";

/** Ephemeral (persist: false) keys recorded in the state */
export const readEphemeralKeys = (state: LocationState): string[] => {
  const keys = state?.[ROUTER_EPHEMERAL_KEYS];

  /* Entries written before 0.1.0 hold a key map */
  if (keys && !Array.isArray(keys)) return Object.keys(keys);

  return (keys as string[] | undefined) ?? [];
};

/** State with every ephemeral value and the key list removed */
export const removeEphemeralValues = (state: LocationState) => {
  const result = { ...state };
  for (const key of readEphemeralKeys(state)) delete result[key];
  delete result[ROUTER_EPHEMERAL_KEYS];
  return result;
};

/** State patch recording `key` as ephemeral */
export const markEphemeral = (state: LocationState, key: string) =>
  routerState.ephemeral([
    ...readEphemeralKeys(state).filter((ephemeralKey) => ephemeralKey !== key),
    key,
  ]);

/** State patch removing `key` from the ephemeral key list */
export const unmarkEphemeral = (state: LocationState, key: string) => {
  const remainingKeys = readEphemeralKeys(state).filter(
    (ephemeralKey) => ephemeralKey !== key,
  );
  return routerState.ephemeral(
    remainingKeys.length ? remainingKeys : undefined,
  );
};
