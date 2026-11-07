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

/** Lets the intent's awaited steps run */
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("HistoryDriver", () => {
  it("sends each move only after the one before has landed", async () => {
    const { driver, navigate, sent } = setup();

    /* A push, then a jump back */
    driver.run(async (moves) => {
      await moves.push("/", { pushed: true });
      await moves.go(-2);
    });
    expect(sent).toEqual([["/", { state: { pushed: true } }]]);

    /* A re-render on the same entry is not a landing */
    driver.land(at("a"), navigate);
    await tick();
    expect(sent).toHaveLength(1);

    /* The push lands: the jump goes */
    driver.land(at("b"), navigate);
    await tick();
    expect(sent[1]).toEqual([-2]);
  });

  it("runs intents one after another, and reports running while any runs", async () => {
    const { driver, navigate, sent, onChange } = setup();

    /* Two intents queued at once */
    driver.run(async (moves) => {
      await moves.go(-1);
    });
    driver.run(async (moves) => {
      await moves.replace("/x", null);
    });
    expect(driver.isRunning).toBe(true);
    expect(sent).toEqual([[-1]]);

    /* The first lands: the second starts */
    driver.land(at("b"), navigate);
    await tick();
    expect(sent[1]).toEqual(["/x", { replace: true, state: null }]);

    /* The second lands: the driver is idle */
    driver.land(at("c"), navigate);
    await tick();
    expect(driver.isRunning).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
