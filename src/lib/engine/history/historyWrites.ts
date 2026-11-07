import type { Location, NavigateFunction } from "react-router";
import { positionPushedStep, type WritePlan } from "../core/planChanges";
import { findArea, readEntry, readRecord } from "../core/record";
import type { CloseTarget } from "../core/steps";
import { getLocationPath } from "../core/locationPath";
import type { TabsWrite } from "../../tabs/core/planTabsOp";
import { popToStep } from "../../tabs/core/restoreSteps";
import type { HistoryDriver, Moves } from "../driver/HistoryDriver";

/** The moves back to before a position: the pointer reset first when entries sit above it; null goes back one */
const landWith = async (
  moves: Moves,
  landing: number | null,
  location: Location,
) => {
  /* Reset the pointer: the current entry becomes the last, so the length is exact; then jump */
  if (landing !== null && landing < window.history.length) {
    await moves.push(getLocationPath(location), location.state);
    await moves.go(landing - window.history.length - 1);
    return;
  }

  /* Go back one entry */
  if (landing !== null || location.key !== "default") {
    await moves.go(-1);
    return;
  }

  /* Landed here directly, nothing to go back to */
  await moves.replace("/", undefined);
};

/** Goes back to before a position, skipping entries made since (iframes); null goes back one */
const writeLanding = (
  navigate: NavigateFunction,
  driver: HistoryDriver,
  landing: number | null,
  location: Location,
) => {
  if (landing !== null && landing < window.history.length) {
    /* A jump past other entries runs as the driver's back intent */
    driver.run((moves) => landWith(moves, landing, location));
  } else if (landing !== null || location.key !== "default") {
    /* Go back one entry */
    navigate(-1);
  } else {
    /* Landed here directly, nothing to go back to */
    navigate("/", { replace: true });
  }
};

/** Goes back to before a position, then writes a tab entry there, as one intent */
const writeLandingThenEntry = (
  driver: HistoryDriver,
  landing: number | null,
  location: Location,
  write: TabsWrite,
) => {
  driver.run(async (moves) => {
    await landWith(moves, landing, location);
    await moves.write((navigate) => writeTabsEntry(navigate, write));
  });
};

/** Closes values: lands before their push, or goes back one when unrecorded (virtual pops are written by the transactions) */
const writeClose = (
  navigate: NavigateFunction,
  driver: HistoryDriver,
  target: Exclude<CloseTarget, { kind: "virtualPop" }>,
  location: Location,
) => {
  /* Land before the push, or go back one */
  const landing = target.kind === "land" ? target.before : null;
  writeLanding(navigate, driver, landing, location);
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
  driver: HistoryDriver,
  target: Extract<CloseTarget, { kind: "virtualPop" }>,
  location: Location,
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
    writeLandingThenEntry(driver, target.landBefore, location, write);
  }
};

export {
  writeChanges,
  writeClose,
  writeLanding,
  writeLandingThenEntry,
  writeTabsEntry,
  writeVirtualPop,
};
