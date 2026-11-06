import { useCallback, useId, useMemo } from "react";
import { useLocationToggle } from "./useLocationToggle";
import type { UseLocationStateOptions } from "./useSetLocationState";

/** Props to spread on a UI library's popup root */
interface LocationPopupProps {
  open: boolean;
  /** Takes the open status; any extra arguments from the library are ignored */
  onOpenChange: (open: boolean) => void;
}

/** A hook for a UI library popup (menu, select, picker) that closes on back and never reopens after a reload */
const useLocationPopup = (
  name = "popup",
  options?: UseLocationStateOptions,
): LocationPopupProps => {
  /* Every instance gets its own key */
  const key = `${name}-${useId()}`;
  const [open, toggle] = useLocationToggle(key, {
    persist: false,
    inherit: false,
    ...options,
  });

  /* Library callbacks pass extra details (events, reasons) to drop */
  const onOpenChange = useCallback((open: boolean) => toggle(open), [toggle]);

  return useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
};

export { useLocationPopup };
export type { LocationPopupProps };
