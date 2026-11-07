import { useMemo } from "react";
import {
  LocationStateDefaultsContext,
  type LocationStateDefaults,
} from "./LocationStateDefaultsContext";

/** Props of LocationStateDefaultsProvider: the defaults, and the section they cover */
interface LocationStateDefaultsProviderProps extends LocationStateDefaults {
  children?: React.ReactNode;
}

/** A provider setting default options for every location state value inside it */
const LocationStateDefaultsProvider = ({
  persist,
  inherit,
  children,
}: LocationStateDefaultsProviderProps) => {
  /* The defaults for the context */
  const value = useMemo(() => ({ persist, inherit }), [persist, inherit]);

  /* The defaults for everything inside */
  return (
    <LocationStateDefaultsContext.Provider value={value}>
      {children}
    </LocationStateDefaultsContext.Provider>
  );
};

export { LocationStateDefaultsProvider };
export type { LocationStateDefaultsProviderProps };
