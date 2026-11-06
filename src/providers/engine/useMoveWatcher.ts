import { useLayoutEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router";
import { readHistoryIndex } from "../../utils/history";
import { getLocationPath } from "../../utils/location";
import type { MoveDecider, UndoDecision } from "./deciders/types";
import type { EngineWork } from "./EngineWork";

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

/** Watches the user's history moves and undoes those a decider asks to, keeping the screen on show */
const useMoveWatcher = (
  location: Location,
  deciders: MoveDecider[],
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
  const index = readHistoryIndex() ?? 0;
  const delta = index - (settled.index ?? 0);
  const isFinishedMove =
    location.key !== settled.location.key && !revert && !isCorrecting;
  const isUserMove = isFinishedMove && !work.isBusy;

  /* The first decider that undoes the move decides */
  const decision = useMemo(() => {
    if (!isUserMove) return undefined;

    const move = {
      from: settled.location,
      to: location,
      type: navigationType,
      index,
      delta,
    };

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

  /** The location kept on show while a move is undone */
  const frozenLocation = decision ? settled.location : revert?.location;

  /* Finish once the undo has landed back */
  useLayoutEffect(() => {
    if (!revert || location.key === revert.fromKey || isCorrecting) return;

    revert.decision.onLanded(navigate);
    // oxlint-disable-next-line react/set-state-in-effect
    setRevert(null);
  }, [revert, location.key, isCorrecting, navigate]);

  /* Undo the move */
  useLayoutEffect(() => {
    if (!decision || !tryLock()) return;

    decision.onUndo?.();

    if (decision.undo === "traverse") {
      navigate(-delta);
    } else {
      navigate(getLocationPath(settled.location), {
        replace: true,
        state: settled.location.state,
      });
    }

    // oxlint-disable-next-line react/set-state-in-effect
    setRevert({ decision, location: settled.location, fromKey: location.key });
  }, [decision, delta, location.key, settled, navigate, tryLock]);

  return {
    settledLocation: settled.location,
    frozenLocation,
    isReverting: frozenLocation !== undefined,
  };
};

export { useMoveWatcher };
