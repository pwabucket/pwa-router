import type { Location, NavigationType } from "react-router";
import type { Moves } from "./driver/HistoryDriver";

/** A history move the user made, away from the settled location */
interface UserMove {
  from: Location;
  to: Location;
  type: NavigationType;
  /** React Router's index of the entry the move landed on */
  index: number;
  /** How far the move went: the index minus the settled one */
  delta: number;
}

/** A decision to undo a user move, and what to do around it */
interface UndoDecision {
  /** How to undo it: go the other way, or restore the settled entry in place */
  undo: "traverse" | "restore";
  /** Runs as the move is undone */
  onUndo?: () => void;
  /** Runs once the undo has landed back; its moves go through the driver */
  onLanded: (moves: Moves) => Promise<unknown> | void;
}

/** Decides whether a user move is undone; the first decider that does wins */
type MoveDecider = (move: UserMove) => UndoDecision | undefined;

export type { MoveDecider, UndoDecision, UserMove };
