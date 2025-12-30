import type { WorkflowSpec } from "@corely/contracts";

export const helloWorkflowSpec: WorkflowSpec = {
  id: "hello-workflow",
  initial: "start",
  context: {
    greeted: false,
  },
  states: {
    start: {
      on: {
        WORKFLOW_START: {
          target: "notify",
          actions: [
            {
              type: "createTask",
              task: {
                type: "EMAIL",
                name: "send-hello",
                input: {
                  subject: "Hello",
                  to: "user@example.com",
                  body: "Welcome to the workflow engine",
                },
                completionEvent: "HELLO_SENT",
              },
            },
          ],
        },
      },
    },
    notify: {
      on: {
        HELLO_SENT: { target: "done" },
      },
    },
    done: {
      type: "final",
    },
  },
};
