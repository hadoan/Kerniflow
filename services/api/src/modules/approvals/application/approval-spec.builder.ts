import type { WorkflowSpec } from "@corely/contracts";
import type { ApprovalPolicyInput } from "@corely/contracts";

const APPROVAL_REQUESTED_EVENT = "APPROVAL_REQUESTED";
const APPROVAL_REJECTED_EVENT = "APPROVAL_REJECTED";

export function buildApprovalWorkflowSpec(policy: ApprovalPolicyInput): WorkflowSpec {
  const states: Record<string, any> = {};
  const stepCount = policy.steps.length;

  policy.steps.forEach((step, index) => {
    const stepNumber = index + 1;
    const stepState = `step_${stepNumber}`;
    const approveEvent = `STEP_${stepNumber}_APPROVED`;
    const nextState = stepNumber === stepCount ? "approved" : `step_${stepNumber + 1}`;

    states[stepState] = {
      on: {
        [approveEvent]: {
          target: nextState,
          actions:
            stepNumber === stepCount
              ? []
              : [createTaskAction(policy, policy.steps[stepNumber], stepNumber + 1)],
        },
        [APPROVAL_REJECTED_EVENT]: { target: "rejected" },
      },
    };
  });

  states.start = {
    on: {
      [APPROVAL_REQUESTED_EVENT]: {
        target: "step_1",
        actions: [createTaskAction(policy, policy.steps[0], 1)],
      },
    },
  };

  states.approved = { type: "final" };
  states.rejected = { type: "final" };

  return {
    id: `approval-${policy.key}`,
    initial: "start",
    context: {
      policyKey: policy.key,
      policyName: policy.name,
      rules: policy.rules ?? null,
    },
    meta: {
      policy: {
        rules: policy.rules ?? null,
        steps: policy.steps,
      },
    },
    states,
  };
}

function createTaskAction(
  policy: ApprovalPolicyInput,
  step: ApprovalPolicyInput["steps"][number],
  stepNumber: number
) {
  const approveEvent = `STEP_${stepNumber}_APPROVED`;
  return {
    type: "createTask" as const,
    task: {
      type: "HUMAN" as const,
      name: step.name,
      assigneeUserId: step.assigneeUserId,
      assigneeRoleId: step.assigneeRoleId,
      assigneePermissionKey: step.assigneePermissionKey,
      dueAt: step.dueInHours
        ? new Date(Date.now() + step.dueInHours * 3600 * 1000).toISOString()
        : undefined,
      input: {
        policyKey: policy.key,
        stepNumber,
        approveEvent,
        rejectEvent: APPROVAL_REJECTED_EVENT,
      },
      completionEvent: approveEvent,
    },
  };
}

export const ApprovalWorkflowEvents = {
  REQUESTED: APPROVAL_REQUESTED_EVENT,
  REJECTED: APPROVAL_REJECTED_EVENT,
};
