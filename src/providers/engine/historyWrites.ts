import type { Location, NavigateFunction } from "react-router";
import { routerState } from "../../constants";
import { positionPushedStep, type WritePlan } from "../../core/planChanges";
import { readRecord } from "../../core/record";
import type { CloseTarget } from "../../core/steps";
import { getLocationPath } from "../../utils/location";
import type { TabsWrite } from "../../core/planTabs";

/** Goes back to before a position, skipping entries made since (iframes); null goes back one */
const writeLanding = (
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

/** Closes values: lands before their push, or goes back one when unrecorded (virtual pops are written by the transactions) */
const writeClose = (
  navigate: NavigateFunction,
  target: Exclude<CloseTarget, { kind: "virtualPop" }>,
  location: Location,
) => {
  const landing = target.kind === "land" ? target.before : null;
  writeLanding(navigate, landing, location);
};

/** Writes location state changes: in place first, then one push, positioned once it lands */
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

  /* Give the pushed step its entry's place in history */
  if (plan.position) {
    navigate(path, {
      ...plan.options,
      replace: true,
      state: positionPushedStep(
        plan.state,
        readRecord(plan.state)!,
        plan.position,
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

export { writeChanges, writeClose, writeLanding, writeTabsEntry };
