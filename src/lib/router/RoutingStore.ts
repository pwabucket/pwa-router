import type { PWARoutingContextValue } from "../../contexts/router/PWARoutingContext";

/** A store holding the engine's view of the router, read whole or in slices */
class RoutingStore {
  /* The view rendered last, and the one subscribers were last told about */
  #view: PWARoutingContextValue;
  #publishedView: PWARoutingContextValue;

  /** The subscribers, called when the view changes */
  #listeners = new Set<() => void>();

  constructor(view: PWARoutingContextValue) {
    this.#view = view;
    this.#publishedView = view;
  }

  /** The current view */
  getView = () => this.#view;

  /** Subscribes to changes of the view; returns the unsubscribe */
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Holds a newly rendered view; readers rendering now see it, subscribers hear of it on publish */
  write(view: PWARoutingContextValue) {
    this.#view = view;
  }

  /** Tells subscribers about the view written since the last publish */
  publish() {
    if (this.#view === this.#publishedView) return;
    this.#publishedView = this.#view;

    for (const listener of this.#listeners) listener();
  }
}

export { RoutingStore };
