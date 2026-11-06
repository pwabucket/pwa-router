import { ROUTER_LAYERS } from "../constants";
import type { LocationState } from "./location";

/** Where a value was pushed, as the history length right after each push */
interface LayerStamp {
  /** The value's first push */
  start: number;
  /** The value's latest push */
  latest: number;
}

/** Layer stamps by state key */
type LayerStampMap = Record<string, LayerStamp>;

/** Layer stamps recorded in the state */
export const readLayers = (state: LocationState) =>
  (state?.[ROUTER_LAYERS] as LayerStampMap | undefined) ?? {};

/** The stamp of a value that is set; a value set to null or undefined has none */
export const readLayer = (state: LocationState, key: string) =>
  state?.[key] != null ? readLayers(state)[key] : undefined;

/** State patch holding the given layer stamps */
export const writeLayers = (layers: LayerStampMap) => ({
  [ROUTER_LAYERS]: Object.keys(layers).length ? layers : undefined,
});

/** State patch with the stamps of `keys` removed */
export const removeLayers = (state: LocationState, keys: string[]) => {
  const layers = { ...readLayers(state) };
  for (const key of keys) delete layers[key];
  return writeLayers(layers);
};

export type { LayerStamp, LayerStampMap };
