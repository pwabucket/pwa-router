import type { Location, NavigateFunction, To } from "react-router";

/** One move through the router */
type Move =
  /** Goes back (negative) or forth (positive) by a number of entries */
  | { kind: "go"; delta: number }
  /** Pushes an entry, dropping every entry ahead of it */
  | { kind: "push"; to: To; state: unknown }
  /** Replaces the current entry */
  | { kind: "replace"; to: To; state: unknown }
  /** Navigations sent together in one tick (e.g. a push and its stamp) */
  | { kind: "write"; send: (navigate: NavigateFunction) => void };

/** Builds a move when it's sent, after the step before has landed; null makes no move */
type Step = () => Move | null;

/** A correction: its steps in order, and what to do once its last move is on its way */
interface Intent {
  steps: Step[];
  onLastMoveSent?: () => void;
}

/** The engine's movement of the history: intents run one at a time, direct writes in flight, and one correction per entry */
class HistoryDriver {
  /* The router's latest navigate, and the latest location on screen */
  #navigate: NavigateFunction | null = null;
  #location: Location | null = null;

  /* The intents waiting their turn, the running one, and the step it is on */
  #queue: Intent[] = [];
  #current: Intent | null = null;
  #stepIndex = 0;

  /** The entry the move in flight left; null while no move is in flight */
  #movedFromKey: string | null = null;

  /** Moves are still to come: the engine is correcting until the last one is sent */
  #isCorrecting = false;

  /* Direct writes: the entry the latest was sent from (null once landed), and a tab operation running */
  #sentFrom: string | null = null;
  #isOperating = false;

  /* The correction lock: the entry it belongs to, and whether a correction holds it */
  #lockedKey: string | null = null;
  #isLocked = false;

  /** Called when the driver stops correcting without a move left to render */
  readonly #onChange: () => void;

  constructor(onChange: () => void) {
    this.#onChange = onChange;
  }

  /** An intent has moves still to send: navigations wait, and the history is moving on purpose */
  get isRunning() {
    return this.#isCorrecting;
  }

  /** Direct writes were sent and haven't landed */
  get isSent() {
    return this.#sentFrom !== null;
  }

  /** A tab operation needing more than one landing is running */
  get isOperating() {
    return this.#isOperating;
  }

  /** The engine's own writes are moving the history: user moves aren't told apart meanwhile */
  get isBusy() {
    return this.isSent || this.#isOperating;
  }

  /** Records direct writes sent from the given entry */
  markSent(locationKey: string) {
    this.#sentFrom = locationKey;
  }

  /** The direct writes have landed on a new entry */
  hasLanded(locationKey: string) {
    return this.#sentFrom !== null && this.#sentFrom !== locationKey;
  }

  /** Marks the direct writes as landed */
  markLanded() {
    this.#sentFrom = null;
  }

  /** Marks the start or end of a tab operation */
  setOperating(isOperating: boolean) {
    this.#isOperating = isOperating;
  }

  /** Takes the entry's single correction; false when another holds it */
  tryLock() {
    if (this.#isLocked) return false;
    this.#isLocked = true;
    return true;
  }

  /** Takes the location on screen and the router's latest navigate; unlocks a new entry, and a move landing on it sends the next step */
  land(location: Location, navigate: NavigateFunction) {
    this.#location = location;
    this.#navigate = navigate;

    /* A new entry may be corrected once */
    if (location.key !== this.#lockedKey) {
      this.#lockedKey = location.key;
      this.#isLocked = false;
    }

    /* Only a new entry is a landing */
    if (this.#movedFromKey === null || location.key === this.#movedFromKey) {
      return;
    }

    this.#movedFromKey = null;
    this.#advance();
  }

  /** Queues an intent; it starts at once when nothing runs */
  run(steps: Step[], onLastMoveSent?: () => void) {
    this.#queue.push({ steps, onLastMoveSent });
    if (!this.#current) this.#start();
  }

  /** Starts the next queued intent, if any */
  #start() {
    this.#current = this.#queue.shift() ?? null;
    this.#stepIndex = 0;
    if (!this.#current) return;

    this.#isCorrecting = true;
    this.#advance();
  }

  /** Sends the running intent's next move, or finishes it */
  #advance() {
    const intent = this.#current!;

    /* Each remaining step, until one makes a move */
    while (this.#stepIndex < intent.steps.length) {
      const step = intent.steps[this.#stepIndex];
      this.#stepIndex += 1;
      const isLast = this.#stepIndex === intent.steps.length;

      /* A step that fails ends the intent */
      let move: Move | null;
      try {
        move = step();
      } catch (error) {
        console.error(error);
        break;
      }
      if (!move) continue;

      /* The last move's landing is no longer a correction; its callback goes with it */
      if (isLast) this.#isCorrecting = false;
      this.#send(move);
      if (isLast) this.#callBack(intent);
      return;
    }

    this.#finish();
  }

  /** Ends the running intent and starts the next */
  #finish() {
    const intent = this.#current!;
    this.#current = null;

    /* Stopped without a last move to render: tell the screen */
    if (this.#isCorrecting) {
      this.#isCorrecting = false;
      this.#onChange();
    }

    this.#callBack(intent);
    this.#start();
  }

  /** Runs an intent's callback once, when its last move is sent or it ends without one */
  #callBack(intent: Intent) {
    const callback = intent.onLastMoveSent;
    intent.onLastMoveSent = undefined;
    callback?.();
  }

  /** Sends a move through the router, waiting for its landing */
  #send(move: Move) {
    const navigate = this.#navigate!;
    this.#movedFromKey = this.#location!.key;

    /* The move, as the router's navigation */
    switch (move.kind) {
      case "go":
        void navigate(move.delta);
        break;
      case "push":
        void navigate(move.to, { state: move.state });
        break;
      case "replace":
        void navigate(move.to, { replace: true, state: move.state });
        break;
      case "write":
        move.send(navigate);
        break;
    }
  }
}

export { HistoryDriver };
export type { Move, Step };
