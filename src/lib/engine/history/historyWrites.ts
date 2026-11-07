import type { Location, NavigateFunction } from "react-router";
import { routerState } from "../../../constants";
import { positionPushedStep, type WritePlan } from "../core/planChanges";
import { findArea, readEntry, readRecord } from "../core/record";
import type { CloseTarget } from "../core/steps";
import { getLocationPath } from "../core/locationPath";
import type { TabsWrite } from "../../tabs/core/planTabsOp";
import { popToStep } from "../../tabs/core/restoreSteps";

/** Goes back to before a position, skipping entries made since (iframes); null goes back one */
const writeLanding = (
  navigate: NavigateFunction,
  landing: number | null,
  location: Location,
) => {
  if (landing !== null && landing < window.history.length) {
    /* Mark the current entry to land before the position */
    navigate(getLocationPath(location), {
      replace: true,
      state: { ...location.state, ...routerState.destroy(landing) },
    });
  } else if (landing !== null || location.key !== "default") {
    /* Go back one entry */
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
  /* Land before the push, or go back one */
  const landing = target.kind === "land" ? target.before : null;
  writeLanding(navigate, landing, location);
};

/** Writes location state changes: in place first, then one push, positioned once it lands */
const writeChanges = (
  navigate: NavigateFunction,
  plan: WritePlan,
  location: Location,
) => {
  /* The current path, kept by every write */
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
  /* Write the entry, stamped with its known position */
  navigate(write.to, {
    replace: write.replace,
    state: write.buildState(write.stamp ?? 0),
  });

  /* Stamp a new push with its position once it lands */
  if (!write.replace && write.stamp === undefined) {
    navigate(write.to, {
      replace: true,
      state: write.buildState(window.history.length),
    });
  }
};

/** Closes onto a virtual step: lands on the tab's lowest real entry if needed, then shows the step there */
const writeVirtualPop = (
  navigate: NavigateFunction,
  target: Extract<CloseTarget, { kind: "virtualPop" }>,
  location: Location,
  continueWith: (write: TabsWrite) => void,
) => {
  /* The current record and the area of the step */
  const { record } = readEntry(location.state);
  const area = findArea(record, target.area)!;

  /* The step, shown in the lowest real entry */
  const write: TabsWrite = {
    to: {
      pathname: target.step.snapshot?.pathname ?? location.pathname,
      search: target.step.snapshot?.search ?? "",
      hash: target.step.snapshot?.hash ?? "",
    },
    replace: true,
    stamp: target.position,
    buildState: () => popToStep(area, record, target.step.id, target.position),
  };

  /* Already on that entry: write it now; otherwise land first, then write */
  if (target.landBefore === null) {
    writeTabsEntry(navigate, write);
  } else {
    continueWith(write);
    writeLanding(navigate, target.landBefore, location);
  }
};

export {
  writeChanges,
  writeClose,
  writeLanding,
  writeTabsEntry,
  writeVirtualPop,
};
