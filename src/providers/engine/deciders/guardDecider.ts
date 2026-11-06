import type { LeaveGuardRegistry } from "../../../utils/leaveGuards";
import type { MoveDecider } from "./types";

/** A decider undoing moves that leave a guard, so its question can be asked */
const createGuardDecider =
  (guards: LeaveGuardRegistry): MoveDecider =>
  ({ from, to, type, index, delta }) => {
    const guardId = guards.findLeavingMove(from, to);
    if (!guardId) return undefined;

    /* Back or forward, and a single push, are undone by going the other way */
    const canTraverse = type === "POP" || (type === "PUSH" && delta === 1);

    return {
      undo: canTraverse ? "traverse" : "restore",

      /* Remember the move, to finish it if the user leaves */
      onUndo: () =>
        guards.block(
          type === "POP"
            ? { kind: "pop", guardId, targetIndex: index }
            : { kind: "navigation", guardId, location: to },
        ),

      /* Ask the guard's question */
      onLanded: () => guards.requestQuestion(guardId),
    };
  };

export { createGuardDecider };
