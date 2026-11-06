import type { Location, NavigateFunction } from "react-router";
import { routerState } from "../../constants";
import { getLocationPath } from "../../utils/location";
import type { TabsWrite } from "../../utils/tabsPlan";
import { stampPushes, type WritePlan } from "../../utils/transaction";

/** Goes back to before a stamp, skipping entries made since (iframes); null goes back one */
const writeClose = (
  navigate: NavigateFunction,
  landing: number | null,
  location: Location,
) => {
  if (landing !== null && landing < window.history.length) {
    navigate(getLocationPath(location), {
      replace: true,
      state: { ...location.state, ...routerState.destroy(landing) },
    });
  } else if (landing !== null || location.key !== "default") {
    navigate(-1);
  } else {
    /* Landed here directly, nothing to go back to */
    navigate("/", { replace: true });
  }
};

/** Writes location state changes: in place first, then one push, stamped */
const writeChanges = (
  navigate: NavigateFunction,
  plan: WritePlan,
  location: Location,
) => {
  const path = getLocationPath(location);

  /* Write the in-place values on the current entry first */
  if (plan.inPlaceState) {
    navigate(path, {
      ...plan.options,
      replace: true,
      state: plan.inPlaceState,
    });
  }

  /* Write every change in one entry */
  navigate(path, {
    ...plan.options,
    replace: plan.replace,
    state: plan.state,
  });

  /* Stamp the pushed values with the entry's place in history */
  if (plan.pushedKeys.length) {
    navigate(path, {
      ...plan.options,
      replace: true,
      state: stampPushes(
        location.state,
        plan.state,
        plan.pushedKeys,
        window.history.length,
      ),
    });
  }
};

/** Writes the entry of a tab operation; a push is stamped once it lands */
const writeTabsEntry = (navigate: NavigateFunction, write: TabsWrite) => {
  navigate(write.to, {
    replace: write.replace,
    state: write.buildState(write.stamp ?? 0),
  });

  if (!write.replace && write.stamp === undefined) {
    navigate(write.to, {
      replace: true,
      state: write.buildState(window.history.length),
    });
  }
};

export { writeChanges, writeClose, writeTabsEntry };
