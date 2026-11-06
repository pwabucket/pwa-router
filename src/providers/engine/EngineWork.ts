/** The engine's own history work: what it sent, and operations still running */
class EngineWork {
  /** The entry the latest piece of work was sent from; null when it landed */
  private sentFrom: string | null = null;

  /** An operation that needs more than one landing (a tab switch) is running */
  private operating = false;

  /** Work was sent and hasn't landed */
  get isSent() {
    return this.sentFrom !== null;
  }

  /** An operation needing more than one landing is running */
  get isOperating() {
    return this.operating;
  }

  /** The engine is moving the history: user moves aren't told apart meanwhile */
  get isBusy() {
    return this.isSent || this.operating;
  }

  /** Records work sent from the given entry */
  send(locationKey: string) {
    this.sentFrom = locationKey;
  }

  /** The sent work has landed on a new entry */
  hasLanded(locationKey: string) {
    return this.sentFrom !== null && this.sentFrom !== locationKey;
  }

  /** Marks the sent work as landed */
  land() {
    this.sentFrom = null;
  }

  /** Marks the start or end of an operation needing more than one landing */
  setOperating(operating: boolean) {
    this.operating = operating;
  }
}

export { EngineWork };
