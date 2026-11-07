import type { Location, NavigateFunction } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { HistoryDriver } from "../HistoryDriver";

/** A location with a key */
const at = (key: string) => ({ pathname: "/", key }) as Location;

/** A driver on a fake router whose moves land only when the test says so */
const setup = () => {
  const sent: unknown[][] = [];
  const navigate = ((...args: unknown[]) => {
    sent.push(args);
  }) as NavigateFunction;
  const onChange = vi.fn();
  const driver = new HistoryDriver(onChange);
  driver.land(at("a"), navigate);
  return { driver, navigate, sent, onChange };
};

describe("HistoryDriver", () => {
  it("sends each step only after the one before has landed", () => {
    const { driver, navigate, sent } = setup();

    /* A push, then a jump back */
    driver.run([
      () => ({ kind: "push", to: "/", state: { pushed: true } }),
      () => ({ kind: "go", delta: -2 }),
    ]);
    expect(sent).toEqual([["/", { state: { pushed: true } }]]);

    /* A render on the same entry is not a landing */
    driver.land(at("a"), navigate);
    expect(sent).toHaveLength(1);

    /* The push lands: the jump goes */
    driver.land(at("b"), navigate);
    expect(sent[1]).toEqual([-2]);
  });

  it("stops correcting and calls back as its last move is sent", () => {
    const { driver, navigate, onChange } = setup();
    const onLastMoveSent = vi.fn();

    /* Two moves: correcting until the last is sent */
    driver.run(
      [() => ({ kind: "go", delta: -1 }), () => ({ kind: "go", delta: -1 })],
      onLastMoveSent,
    );
    expect(driver.isRunning).toBe(true);
    expect(onLastMoveSent).not.toHaveBeenCalled();

    /* The first lands: the last is sent, and the callback runs with it */
    driver.land(at("b"), navigate);
    expect(driver.isRunning).toBe(false);
    expect(onLastMoveSent).toHaveBeenCalledTimes(1);

    /* The last lands: nothing more, and no extra render asked for */
    driver.land(at("c"), navigate);
    expect(onLastMoveSent).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("runs intents one after another", () => {
    const { driver, navigate, sent } = setup();

    /* Two intents queued at once */
    driver.run([() => ({ kind: "go", delta: -1 })]);
    driver.run([() => ({ kind: "replace", to: "/x", state: null })]);
    expect(sent).toEqual([[-1]]);

    /* The first lands: the second starts */
    driver.land(at("b"), navigate);
    expect(sent[1]).toEqual(["/x", { replace: true, state: null }]);
  });

  it("tells the screen when it stops without a move to render", () => {
    const { driver, onChange } = setup();
    const onLastMoveSent = vi.fn();

    driver.run([() => null], onLastMoveSent);
    expect(driver.isRunning).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onLastMoveSent).toHaveBeenCalledTimes(1);
  });

  it("allows one correction per entry, unlocking each new one", () => {
    const { driver, navigate } = setup();

    /* The first correction takes the entry; a second can't */
    expect(driver.tryLock()).toBe(true);
    expect(driver.tryLock()).toBe(false);

    /* The same entry stays locked; a new one is free */
    driver.land(at("a"), navigate);
    expect(driver.tryLock()).toBe(false);
    driver.land(at("b"), navigate);
    expect(driver.tryLock()).toBe(true);
  });

  it("tracks direct writes until they land on another entry", () => {
    const { driver } = setup();

    /* Sent from an entry: busy until landed elsewhere */
    driver.markSent("a");
    expect(driver.isBusy).toBe(true);
    expect(driver.hasLanded("a")).toBe(false);
    expect(driver.hasLanded("b")).toBe(true);

    /* Landed: idle again */
    driver.markLanded();
    expect(driver.isBusy).toBe(false);

    /* A running tab operation keeps it busy */
    driver.setOperating(true);
    expect(driver.isBusy).toBe(true);
  });
});
