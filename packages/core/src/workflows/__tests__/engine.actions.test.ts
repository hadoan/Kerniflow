import { describe, expect, it } from "vitest";
import {
  applyWorkflowEvents,
  getInitialSnapshot,
  serializeSnapshot,
  restoreSnapshot,
} from "../engine";

const baseSpec = {
  initial: "idle",
  context: { allow: true },
  states: {
    idle: {
      on: {
        CONTINUE: {
          target: "done",
          actions: [{ type: "assign", path: "status", value: "ok" }],
          guard: { type: "contextEquals", path: "allow", value: true },
        },
      },
    },
    done: { type: "final" },
  },
} as const;

describe("workflow engine actions", () => {
  it("applies assign actions to context", () => {
    const snapshot = getInitialSnapshot(baseSpec, { allow: true });
    const result = applyWorkflowEvents(baseSpec, snapshot, [{ type: "CONTINUE", payload: {} }]);

    expect(result.snapshot.value).toBe("done");
    expect(result.snapshot.context.status).toBe("ok");
  });

  it("honors inline guard definitions", () => {
    const snapshot = getInitialSnapshot(baseSpec, { allow: false });
    const result = applyWorkflowEvents(baseSpec, snapshot, [{ type: "CONTINUE", payload: {} }]);

    expect(result.snapshot.value).toBe("idle");
  });

  it("round-trips snapshot serialization", () => {
    const snapshot = getInitialSnapshot(baseSpec, { allow: true });
    const serialized = serializeSnapshot(snapshot);
    const restored = restoreSnapshot(serialized);

    expect(restored.value).toBe(snapshot.value);
    expect(restored.context).toEqual(snapshot.context);
  });
});
