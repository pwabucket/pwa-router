import {
  ROUTER_EPHEMERAL_KEYS,
  routerState,
  type EphemeralKeyMap,
} from "../constants";
import type { LocationState } from "./location";

/** Ephemeral (persist: false) keys recorded in the state */
export const readEphemeralKeys = (state: LocationState) =>
  (state?.[ROUTER_EPHEMERAL_KEYS] as EphemeralKeyMap | undefined) ?? {};

/** State with every ephemeral value and the key map removed */
export const removeEphemeralValues = (state: LocationState) => {
  const result = { ...state };
  for (const key of Object.keys(readEphemeralKeys(state))) delete result[key];
  delete result[ROUTER_EPHEMERAL_KEYS];
  return result;
};

/** State patch recording `key` as ephemeral, with its index key if any */
export const markEphemeral = (
  state: LocationState,
  key: string,
  indexKey: string | null,
) => routerState.ephemeral({ ...readEphemeralKeys(state), [key]: indexKey });

/** State patch removing `key` from the ephemeral key map */
export const unmarkEphemeral = (state: LocationState, key: string) => {
  const { [key]: _, ...remainingKeys } = readEphemeralKeys(state);
  return routerState.ephemeral(
    Object.keys(remainingKeys).length ? remainingKeys : undefined,
  );
};
