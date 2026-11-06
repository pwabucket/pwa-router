import { useLayoutEffect, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router";
import { readHistoryIndex } from "../../utils/history";
import type { LeaveGuardRegistry } from "../../utils/leaveGuards";
import { getLocationPath } from "../../utils/location";

/** A location the history settled on, with its history index */
interface SettledLocation {
  location: Location;
  index: number | undefined;
}

/** A history move being undone */
interface Revert {
  guardId: string;
  /** The location it restores */
  location: Location;
  /** The key of the entry the move landed on */
  fromKey: string;
}

/** Undoes history moves that leave a guarded scope, keeping its screen on show */
const useLeaveGuardHandler = (
  location: Location,
  guards: LeaveGuardRegistry,
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

  /* A move the engine didn't send, away from the settled location, leaving a guard */
  const hasMoved = location.key !== settled.location.key;
  const leavingGuardId =
    hasMoved && !revert && !isCorrecting && !guards.isSending
      ? guards.findLeavingMove(settled.location, location)
      : undefined;

  /* Settle on moves that leave no guard, before anything renders */
  if (hasMoved && !revert && !isCorrecting && !leavingGuardId) {
    setSettled({ location, index: readHistoryIndex() });
  }

  /** The location kept on show while a move is undone */
  const frozenLocation = leavingGuardId ? settled.location : revert?.location;

  /* Wake guards whose move has landed outside their scope */
  useLayoutEffect(() => {
    guards.settle(settled.location);
  }, [guards, settled]);

  /* Ask the question once the undo has landed back */
  useLayoutEffect(() => {
    if (!revert || location.key === revert.fromKey || isCorrecting) return;

    guards.requestQuestion(revert.guardId);
    // oxlint-disable-next-line react/set-state-in-effect
    setRevert(null);
  }, [revert, location.key, isCorrecting, guards]);

  /* Remember the leaving move, then undo it */
  useLayoutEffect(() => {
    if (!leavingGuardId || !tryLock()) return;

    const index = readHistoryIndex() ?? 0;
    const delta = index - (settled.index ?? 0);

    if (navigationType === "POP") {
      /* Back or forward: go the other way */
      guards.block({
        kind: "pop",
        guardId: leavingGuardId,
        targetIndex: index,
      });
      navigate(-delta);
    } else if (navigationType === "PUSH" && delta === 1) {
      /* A push: go back to the entry it was made from */
      guards.block({ kind: "navigation", guardId: leavingGuardId, location });
      navigate(-1);
    } else {
      /* A replace (or a push that skipped entries): restore the entry */
      guards.block({ kind: "navigation", guardId: leavingGuardId, location });
      navigate(getLocationPath(settled.location), {
        replace: true,
        state: settled.location.state,
      });
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setRevert({
      guardId: leavingGuardId,
      location: settled.location,
      fromKey: location.key,
    });
  }, [
    leavingGuardId,
    location,
    navigationType,
    settled,
    guards,
    navigate,
    tryLock,
  ]);

  return { frozenLocation, isReverting: frozenLocation !== undefined };
};

export { useLeaveGuardHandler };
