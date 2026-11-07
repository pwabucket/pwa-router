import type { Location, NavigateFunction, To } from "react-router";

/** The moves an intent makes, each resolving with the location it lands on */
interface Moves {
  /** Goes back (negative) or forth (positive) by a number of entries */
  go: (delta: number) => Promise<Location>;
  /** Pushes an entry, dropping every entry ahead of it */
  push: (to: To, state: unknown) => Promise<Location>;
  /** Replaces the current entry */
  replace: (to: To, state: unknown) => Promise<Location>;
  /** Sends navigations made together in one tick (e.g. a push and its stamp), waiting for their landing */
  write: (send: (navigate: NavigateFunction) => void) => Promise<Location>;
}

/** A correction made of moves, run start to finish before the next one */
type Intent = (moves: Moves) => Promise<void>;

/** A move waiting for its landing: the entry it left, and what to call once it lands */
interface PendingMove {
  fromKey: string;
  resolve: (location: Location) => void;
}

/** Runs intents one at a time, each move waiting for its landing before the next */
class HistoryDriver {
  /* The router's latest navigate, and the latest location on screen */
  #navigate: NavigateFunction | null = null;
  #location: Location | null = null;

  /* The move waiting for its landing, the intents waiting their turn, and whether one runs */
  #pending: PendingMove | null = null;
  #queue: Intent[] = [];
  #isRunning = false;

  /** Called when the driver starts or stops running */
  readonly #onChange: () => void;

  /** The moves handed to every intent */
  readonly #moves: Moves = {
    go: (delta) => this.#move((navigate) => navigate(delta)),
    push: (to, state) => this.#move((navigate) => navigate(to, { state })),
    replace: (to, state) =>
      this.#move((navigate) => navigate(to, { replace: true, state })),
    write: (send) => this.#move(send),
  };

  constructor(onChange: () => void) {
    this.#onChange = onChange;
  }

  /** An intent is running: navigations wait, and the history is moving on purpose */
  get isRunning() {
    return this.#isRunning;
  }

  /** Takes the location on screen and the router's latest navigate; lands a waiting move on a new entry */
  land(location: Location, navigate: NavigateFunction) {
    this.#location = location;
    this.#navigate = navigate;

    /* Only a new entry is a landing */
    const pending = this.#pending;
    if (!pending || location.key === pending.fromKey) return;

    this.#pending = null;
    pending.resolve(location);
  }

  /** Queues an intent; it runs once every earlier one has finished */
  run(intent: Intent) {
    this.#queue.push(intent);
    if (!this.#isRunning) void this.#drain();
  }

  /** Runs the queued intents in order */
  async #drain() {
    this.#setRunning(true);

    /* One intent at a time; a failed one never stops the rest */
    for (let intent = this.#queue.shift(); intent; intent = this.#queue.shift()) {
      try {
        await intent(this.#moves);
      } catch (error) {
        console.error(error);
      }
    }

    this.#setRunning(false);
  }

  /** Sends one move and waits for it to land on a new entry */
  #move(send: (navigate: NavigateFunction) => void) {
    return new Promise<Location>((resolve) => {
      this.#pending = { fromKey: this.#location!.key, resolve };
      send(this.#navigate!);
    });
  }

  /** Marks the driver as running or idle */
  #setRunning(isRunning: boolean) {
    this.#isRunning = isRunning;
    this.#onChange();
  }
}

export { HistoryDriver };
export type { Intent, Moves };
