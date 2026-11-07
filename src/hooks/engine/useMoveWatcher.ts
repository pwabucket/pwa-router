import { useLayoutEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router";
import { readHistoryIndex } from "../../lib/engine/history/historyIndex";
import { getLocationPath } from "../../lib/engine/core/locationPath";
import type { MoveDecider, UndoDecision } from "../../lib/engine/moveDeciders";
import type { EngineWork } from "../../lib/engine/EngineWork";

/** A location the history settled on, with its history index */
interface SettledLocation {
  location: Location;
  index: number | undefined;
}

/** A user move being undone */
interface Revert {
  decision: UndoDecision;
  /** The location it restores */
  location: Location;
  /** The key of the entry the move landed on */
  fromKey: string;
}

/** A hook that watches the user's history moves and undoes those a decider asks to, keeping the screen on show */
const useMoveWatcher = (
  location: Location,
  deciders: MoveDecider[],
  work: EngineWork,
  isCorrecting: boolean,
  tryLock: () => boolean,
) => {
  /* The router, the move being undone, and the settled location */
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [revert, setRevert] = useState<Revert | null>(null);
  const [settled, setSettled] = useState<SettledLocation>(() => ({
    location,
    index: readHistoryIndex(),
  }));

  /* A finished move away from the settled location; the user's unless the engine sent it */
  const index = readHistoryIndex() ?? 0;
  const delta = index - (settled.index ?? 0);
  const isFinishedMove =
    location.key !== settled.location.key && !revert && !isCorrecting;
  const isUserMove = isFinishedMove && !work.isBusy;

  /* The first decider that undoes the move decides */
  const decision = useMemo(() => {
    if (!isUserMove) return undefined;

    /* The move from the settled location */
    const move = {
      from: settled.location,
      to: location,
      type: navigationType,
      index,
      delta,
    };

    /* Ask each decider in order */
    for (const decide of deciders) {
      const result = decide(move);
      if (result) return result;
    }
    return undefined;
  }, [isUserMove, settled, location, navigationType, index, delta, deciders]);

  /* Settle on moves that need no undo, before anything renders */
  if (isFinishedMove && !decision) {
    setSettled({ location, index });
  }

  /* The location kept on show while a move is undone */
  const frozenLocation = decision ? settled.location : revert?.location;

  /* Finish once the undo has landed back */
  useLayoutEffect(() => {
    if (!revert || location.key === revert.fromKey || isCorrecting) return;

    /* Finish the decision and end the revert */
    revert.decision.onLanded(navigate);
    // oxlint-disable-next-line react/set-state-in-effect
    setRevert(null);
  }, [revert, location.key, isCorrecting, navigate]);

  /* Undo the move */
  useLayoutEffect(() => {
    if (!decision || !tryLock()) return;

    /* Tell the decision the undo starts */
    decision.onUndo?.();

    /* Go back by the move's steps, or put the settled location back in place */
    if (decision.undo === "traverse") {
      navigate(-delta);
    } else {
      navigate(getLocationPath(settled.location), {
        replace: true,
        state: settled.location.state,
      });
    }

    /* Keep the settled location on show until the undo lands */
    // oxlint-disable-next-line react/set-state-in-effect
    setRevert({ decision, location: settled.location, fromKey: location.key });
  }, [decision, delta, location.key, settled, navigate, tryLock]);

  /* The settled location, and the one kept on show while undoing */
  return {
    settledLocation: settled.location,
    frozenLocation,
    isReverting: frozenLocation !== undefined,
  };
};

export { useMoveWatcher };
