import { useLocation } from "../router/useLocation";
import { isNonInheritedEntry } from "../../lib/layers/nonInheritedState";

/** A hook for a link's replace: by default when leaving an entry that holds non-inherited values */
const useReplaceDefault = (replace?: boolean) => {
  const location = useLocation();

  return replace ?? isNonInheritedEntry(location.state);
};

export { useReplaceDefault };
