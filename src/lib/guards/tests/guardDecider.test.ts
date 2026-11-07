import { NavigationType } from "react-router";
import { describe, expect, it } from "vitest";
import { at, back } from "../../engine/tests/moves";
import { createGuardDecider } from "../guardDecider";
import { LeaveGuardRegistry } from "../LeaveGuardRegistry";

describe("guard decider", () => {
  it("undoes a move leaving an active guard, then asks its question", () => {
    const guards = new LeaveGuardRegistry();
    guards.set("g", { pathname: "/edit", when: true });
    const decision = createGuardDecider(guards)(back(at("/edit"), at("/")));

    expect(decision?.undo).toBe("traverse");

    decision?.onUndo?.();
    decision?.onLanded?.();
    expect(guards.takePendingQuestion()).toBe("g");
    expect(guards.takeAttempt()).toEqual({
      kind: "pop",
      guardId: "g",
      targetIndex: 0,
    });
  });

  it("restores the entry after a replace", () => {
    const guards = new LeaveGuardRegistry();
    guards.set("g", { pathname: "/edit", when: true });
    const move = {
      ...back(at("/edit"), at("/")),
      type: NavigationType.Replace,
    };

    expect(createGuardDecider(guards)(move)?.undo).toBe("restore");
  });

  it("lets moves through with nothing unsaved", () => {
    const guards = new LeaveGuardRegistry();
    guards.set("g", { pathname: "/edit", when: false });

    expect(createGuardDecider(guards)(back(at("/edit"), at("/")))).toBe(
      undefined,
    );
  });
});
