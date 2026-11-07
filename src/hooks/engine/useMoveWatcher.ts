import { useLayoutEffect, useMemo, useState } from "react";
import { useNavigationType, type Location } from "react-router";
import { readHistoryIndex } from "../../lib/engine/history/historyIndex";
import { getLocationPath } from "../../lib/engine/core/locationPath";
import type { MoveDecider } from "../../lib/engine/moveDeciders";
import type { HistoryDriver } from "../../lib/engine/driver/HistoryDriver";
import type { EngineWork } from "../../lib/engine/EngineWork";

/** A location the history settled on, with its history index */
interface SettledLocation {
  location: Location;
  index: number | undefined;
}

/** A hook that watches the user's history moves and undoes those a decider asks to, keeping the screen on show */
const useMoveWatcher = (
  location: Location,
  deciders: MoveDecider[],
  work: EngineWork,
  isCorrecting: boolean,
  tryLock: () => boolean,
  driver: HistoryDriver,
) => {
  /* How the history moved, the location kept on show while undoing, and the settled location */
  const navigationType = useNavigationType();
  const [undoneFrom, setUndoneFrom] = useState<Location | null>(null);
  const [settled, setSettled] = useState<SettledLocation>(() => ({
    location,
    index: readHistoryIndex(),
  }));

  /* A finished move away from the settled location; the user's unless the engine sent it */
  const index = readHistoryIndex() ?? 0;
  const delta = index - (settled.index ?? 0);
  const isFinishedMove =
    location.key !== settled.location.key && !undoneFrom && !isCorrecting;
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
  const frozenLocation = decision
    ? settled.location
    : (undoneFrom ?? undefined);

  /* Undo the move as one intent, keeping the settled location on show until it ends */
  useLayoutEffect(() => {
    if (!decision || !tryLock()) return;

    /* Keep the settled location on show */
    const shown = settled.location;
    // oxlint-disable-next-line react/set-state-in-effect
    setUndoneFrom(shown);

    driver.run(async (moves) => {
      try {
        /* Tell the decision the undo starts */
        decision.onUndo?.();

        /* Go back by the move's steps, or put the settled location back in place */
        if (decision.undo === "traverse") {
          await moves.go(-delta);
        } else {
          await moves.replace(getLocationPath(shown), shown.state);
        }

        /* Finish the decision */
        await decision.onLanded(moves);
      } finally {
        /* Release the screen, whatever happened */
        setUndoneFrom(null);
      }
    });
  }, [decision, delta, settled, tryLock, driver]);

  /* The settled location, and the one kept on show while undoing */
  return {
    settledLocation: settled.location,
    frozenLocation,
    isReverting: frozenLocation !== undefined,
  };
};

export { useMoveWatcher };
