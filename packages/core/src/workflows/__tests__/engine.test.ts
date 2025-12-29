import { describe, expect, it } from "vitest";
import { applyWorkflowEvents, getInitialSnapshot } from "../engine";
import { helloWorkflowSpec } from "../fixtures/hello-workflow";

describe("workflow engine", () => {
  it("builds initial snapshot and applies transitions", () => {
    const snapshot = getInitialSnapshot(helloWorkflowSpec);
    expect(snapshot.value).toBe("start");

    const result = applyWorkflowEvents(helloWorkflowSpec, snapshot, [
      { type: "WORKFLOW_START", payload: { source: "test" } },
    ]);

    expect(result.snapshot.value).toBe("notify");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].type).toBe("EMAIL");
  });

  it("reaches final state after completion event", () => {
    const snapshot = { value: "notify", context: {} };
    const result = applyWorkflowEvents(helloWorkflowSpec, snapshot, [
      { type: "HELLO_SENT", payload: {} },
    ]);

    expect(result.snapshot.value).toBe("done");
  });
});
