import { useLayoutEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router";
import { ROUTER_TABS } from "../../constants";
import { readHistoryIndex } from "../../utils/history";
import type { LeaveGuardRegistry } from "../../utils/leaveGuards";
import type { EngineWork } from "./EngineWork";
import { getLocationPath, type LocationState } from "../../utils/location";
import {
  pageEntryState,
  pagePath,
  type TabsEntryState,
} from "../../utils/tabs";

/** A location the history settled on, with its history index */
interface SettledLocation {
  location: Location;
  index: number | undefined;
}

/** Why a move is undone: it left a guard, or it backed out of a tab's virtual page */
type UndoReason =
  | { kind: "guard"; guardId: string }
  | { kind: "tabPage"; tabs: TabsEntryState };

/** A history move being undone */
interface Revert {
  reason: UndoReason;
  /** The location it restores */
  location: Location;
  /** The key of the entry the move landed on */
  fromKey: string;
}

/** The tabs data of a tab's first entry that still has virtual pages below it */
const readVirtualSlot = (state: LocationState) => {
  const tabs = state?.[ROUTER_TABS] as TabsEntryState | undefined;
  const hasVirtualPages =
    tabs !== undefined &&
    tabs.virtual > 0 &&
    tabs.stamp === tabs.slot &&
    tabs.pages.length === tabs.virtual;

  return hasVirtualPages ? tabs : undefined;
};

/** Undoes history moves the engine handles itself, keeping the screen on show */
const useUndoMoveHandler = (
  location: Location,
  guards: LeaveGuardRegistry,
  work: EngineWork,
  isCorrecting: boolean,
  tryLock: () => boolean,
) => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [revert, setRevert] = useState<Revert | null>(null);
  const [settled, setSettled] = useState<SettledLocation>(() => ({
    location,
    index: readHistoryIndex(),
  }));

  /* A finished move away from the settled location; the user's unless the engine sent it */
  const index = readHistoryIndex();
  const isFinishedMove =
    location.key !== settled.location.key && !revert && !isCorrecting;
  const isUserMove = isFinishedMove && !work.isBusy;

  /* A move leaving a guard asks first */
  const leavingGuardId = isUserMove
    ? guards.findLeavingMove(settled.location, location)
    : undefined;

  /* Back out of a tab's first entry onto a virtual page */
  const virtualSlot =
    isUserMove &&
    !leavingGuardId &&
    navigationType === "POP" &&
    index === (settled.index ?? 0) - 1
      ? readVirtualSlot(settled.location.state)
      : undefined;

  /** The reason to undo this move, if any */
  const undoReason = useMemo((): UndoReason | undefined => {
    if (leavingGuardId) return { kind: "guard", guardId: leavingGuardId };
    if (virtualSlot) return { kind: "tabPage", tabs: virtualSlot };
    return undefined;
  }, [leavingGuardId, virtualSlot]);

  /* Settle on moves that need no undo, before anything renders */
  if (isFinishedMove && !undoReason) {
    setSettled({ location, index });
  }

  /** The location kept on show while a move is undone */
  const frozenLocation = undoReason ? settled.location : revert?.location;

  /* Wake guards whose move has landed outside their scope */
  useLayoutEffect(() => {
    guards.settle(settled.location);
  }, [guards, settled]);

  /* Finish once the undo has landed back */
  useLayoutEffect(() => {
    if (!revert || location.key === revert.fromKey || isCorrecting) return;

    const { reason } = revert;

    if (reason.kind === "guard") {
      /* Ask the guard's question */
      guards.requestQuestion(reason.guardId);
    } else {
      /* Show the tab's previous page in the restored entry */
      const { tabs } = reason;
      const page = tabs.pages[tabs.pages.length - 1];

      navigate(pagePath(page), {
        replace: true,
        state: pageEntryState(page, {
          ...tabs,
          pages: tabs.pages.slice(0, -1),
          virtual: tabs.virtual - 1,
        }),
      });
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setRevert(null);
  }, [revert, location.key, isCorrecting, guards, navigate]);

  /* Remember the move, then undo it */
  useLayoutEffect(() => {
    if (!undoReason || !tryLock()) return;

    const delta = (index ?? 0) - (settled.index ?? 0);

    if (undoReason.kind === "tabPage") {
      /* Back out of a tab: go forward again */
      navigate(-delta);
    } else if (navigationType === "POP") {
      /* Back or forward: go the other way */
      guards.block({
        kind: "pop",
        guardId: undoReason.guardId,
        targetIndex: index ?? 0,
      });
      navigate(-delta);
    } else if (navigationType === "PUSH" && delta === 1) {
      /* A push: go back to the entry it was made from */
      guards.block({
        kind: "navigation",
        guardId: undoReason.guardId,
        location,
      });
      navigate(-1);
    } else {
      /* A replace (or a push that skipped entries): restore the entry */
      guards.block({
        kind: "navigation",
        guardId: undoReason.guardId,
        location,
      });
      navigate(getLocationPath(settled.location), {
        replace: true,
        state: settled.location.state,
      });
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setRevert({
      reason: undoReason,
      location: settled.location,
      fromKey: location.key,
    });
  }, [
    undoReason,
    index,
    location,
    navigationType,
    settled,
    guards,
    navigate,
    tryLock,
  ]);

  return { frozenLocation, isReverting: frozenLocation !== undefined };
};

export { useUndoMoveHandler };
