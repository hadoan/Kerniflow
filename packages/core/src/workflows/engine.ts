import { createMachine, initialTransition, transition as xstateTransition } from "xstate";
import type {
  WorkflowActionSpec,
  WorkflowEventInput,
  WorkflowSpec,
  WorkflowTaskCreateSpec,
} from "@corely/contracts";
import type {
  WorkflowSnapshot,
  WorkflowStateValue,
  WorkflowTransition,
  WorkflowTransitionResult,
} from "./types";

function parseStateValue(value: string | null | undefined): WorkflowStateValue {
  if (!value) {
    return "";
  }

  try {
    return JSON.parse(value) as WorkflowStateValue;
  } catch {
    return value;
  }
}

function serializeStateValue(value: WorkflowStateValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function getContextPath(context: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, context);
}

function buildGuard(guard: any) {
  if (guard.type === "always") {
    return () => true;
  }

  if (guard.type === "contextEquals") {
    return ({ context }: { context: Record<string, unknown> }) =>
      getContextPath(context, guard.path) === guard.value;
  }

  if (guard.type === "eventEquals") {
    return ({ event }: { event: Record<string, unknown> }) =>
      getContextPath(event, guard.path) === guard.value;
  }

  return () => false;
}

function buildGuards(guards: WorkflowSpec["guards"] | undefined) {
  if (!guards) {
    return undefined;
  }

  const entries = Object.entries(guards).map(([name, guard]) => [name, buildGuard(guard)]);
  return Object.fromEntries(entries);
}

function normalizeSpec(spec: WorkflowSpec) {
  const guards: Record<string, any> = { ...(spec.guards ?? {}) };
  let guardIndex = 0;
  const states = structuredClone(spec.states) as Record<string, WorkflowSpec["states"][string]>;

  for (const state of Object.values(states)) {
    if (!state.on) {
      continue;
    }

    for (const transition of Object.values(state.on)) {
      if (typeof transition.guard === "string" || !transition.guard) {
        continue;
      }

      const guardName = `inline_guard_${(guardIndex += 1)}`;
      guards[guardName] = transition.guard;
      transition.guard = guardName;
    }
  }

  return { guards, states };
}

export function buildWorkflowMachine(spec: WorkflowSpec): any {
  const normalized = normalizeSpec(spec);
  return createMachine(
    {
      id: spec.id ?? "workflow",
      initial: spec.initial,
      context: spec.context ?? {},
      states: normalized.states as any,
    },
    {
      guards: buildGuards(normalized.guards),
    }
  ) as any;
}

export function getInitialSnapshot(
  spec: WorkflowSpec,
  inputContext?: Record<string, unknown>
): WorkflowSnapshot {
  const machine = buildWorkflowMachine(spec);
  const [snapshot] = initialTransition(machine);
  const mergedContext = {
    ...(snapshot.context as Record<string, unknown>),
    ...(inputContext ?? {}),
  };

  return {
    value: snapshot.value as WorkflowStateValue,
    context: mergedContext,
  };
}

function collectTaskActions(actions: WorkflowActionSpec[]): WorkflowTaskCreateSpec[] {
  return actions.filter((action) => action.type === "createTask").map((action) => action.task);
}

function applyAssignActions(
  context: Record<string, unknown>,
  actions: WorkflowActionSpec[]
): Record<string, unknown> {
  const next = { ...context };

  for (const action of actions) {
    if (action.type !== "assign") {
      continue;
    }

    const parts = action.path.split(".");
    let cursor: Record<string, unknown> = next;

    while (parts.length > 1) {
      const key = parts.shift();
      if (!key) {
        break;
      }
      if (typeof cursor[key] !== "object" || cursor[key] === null) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }

    const finalKey = parts.shift();
    if (finalKey) {
      cursor[finalKey] = action.value as unknown;
    }
  }

  return next;
}

function normalizeSnapshot(machine: any, snapshot: WorkflowSnapshot) {
  const [base] = initialTransition(machine);

  return {
    ...base,
    value: snapshot.value,
    context: snapshot.context,
  } as typeof base;
}

export function applyWorkflowEvents(
  spec: WorkflowSpec,
  snapshot: WorkflowSnapshot,
  events: WorkflowEventInput[]
): WorkflowTransitionResult {
  const machine = buildWorkflowMachine(spec);
  let current = normalizeSnapshot(machine, snapshot);
  const transitions: WorkflowTransition[] = [];
  const actions: WorkflowActionSpec[] = [];

  for (const event of events) {
    const [next] = xstateTransition(machine, current, event) as any[];
    const transitionData = machine.getTransitionData(current, event) as Array<{
      actions?: any[];
    }>;
    const eventActions = transitionData.flatMap(
      (transition) => transition.actions ?? []
    ) as WorkflowActionSpec[];

    if ((next as any).changed) {
      transitions.push({
        event,
        from: current.value as WorkflowStateValue,
        to: next.value as WorkflowStateValue,
      });
    }

    if (eventActions.length) {
      actions.push(...eventActions);
    }

    current = {
      ...next,
      context: applyAssignActions((next.context ?? {}) as Record<string, unknown>, eventActions),
    } as typeof next;
  }

  const tasks = collectTaskActions(actions);

  return {
    snapshot: {
      value: current.value as WorkflowStateValue,
      context: (current.context ?? {}) as Record<string, unknown>,
    },
    tasks,
    transitions,
    actions,
  };
}

export function serializeSnapshot(snapshot: WorkflowSnapshot): {
  currentState: string;
  context: string;
} {
  return {
    currentState: serializeStateValue(snapshot.value),
    context: JSON.stringify(snapshot.context ?? {}),
  };
}

export function restoreSnapshot(input: {
  currentState?: string | null;
  context?: string | null;
}): WorkflowSnapshot {
  return {
    value: input.currentState ? parseStateValue(input.currentState) : "",
    context: input.context ? (JSON.parse(input.context) as Record<string, unknown>) : {},
  };
}
