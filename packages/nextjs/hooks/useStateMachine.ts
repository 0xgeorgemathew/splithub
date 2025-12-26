/**
 * Type-safe state machine hook
 *
 * Prevents invalid state combinations by defining explicit transitions.
 * Useful for multi-step flows like onboarding, approvals, and payments.
 *
 * @example
 * ```typescript
 * type FlowState = "idle" | "loading" | "success" | "error";
 * type FlowEvent = { type: "LOAD" } | { type: "SUCCESS" } | { type: "ERROR"; message: string } | { type: "RESET" };
 *
 * const transitions: StateTransitions<FlowState, FlowEvent> = {
 *   idle: { LOAD: "loading" },
 *   loading: { SUCCESS: "success", ERROR: "error" },
 *   success: { RESET: "idle" },
 *   error: { RESET: "idle", LOAD: "loading" },
 * };
 *
 * const [state, send, context] = useStateMachine("idle", transitions);
 * ```
 */
import { useCallback, useReducer } from "react";

/**
 * Generic event type - must have a 'type' string property
 */
export type MachineEvent = { type: string };

/**
 * State transition map: for each state, define which events lead to which states
 */
export type StateTransitions<TState extends string, TEvent extends MachineEvent> = {
  [K in TState]: Partial<Record<TEvent["type"], TState>>;
};

/**
 * Context that can be attached to state (e.g., error messages, tx hashes)
 */
export type StateContext<T = unknown> = T;

/**
 * Internal state of the machine
 */
interface MachineState<TState extends string, TContext> {
  current: TState;
  context: TContext;
  history: TState[];
}

/**
 * Hook return type
 */
interface StateMachineReturn<TState extends string, TEvent extends MachineEvent, TContext> {
  /** Current state */
  state: TState;
  /** Send an event to transition state */
  send: (event: TEvent, newContext?: Partial<TContext>) => void;
  /** Current context data */
  context: TContext;
  /** Update context without changing state */
  setContext: (newContext: Partial<TContext>) => void;
  /** Check if machine is in a specific state */
  is: (state: TState) => boolean;
  /** Check if machine is in any of the specified states */
  isAnyOf: (...states: TState[]) => boolean;
  /** Reset to initial state */
  reset: () => void;
  /** Previous state (if any) */
  previousState: TState | undefined;
}

type Action<TState extends string, TEvent extends MachineEvent, TContext> =
  | { type: "TRANSITION"; event: TEvent; newContext?: Partial<TContext> }
  | { type: "SET_CONTEXT"; newContext: Partial<TContext> }
  | { type: "RESET"; initialState: TState; initialContext: TContext };

/**
 * Type-safe state machine hook
 *
 * @param initialState - Starting state of the machine
 * @param transitions - Map of valid state transitions
 * @param initialContext - Optional initial context data
 */
export function useStateMachine<
  TState extends string,
  TEvent extends MachineEvent,
  TContext extends Record<string, unknown> = Record<string, never>,
>(
  initialState: TState,
  transitions: StateTransitions<TState, TEvent>,
  initialContext: TContext = {} as TContext,
): StateMachineReturn<TState, TEvent, TContext> {
  const reducer = (
    state: MachineState<TState, TContext>,
    action: Action<TState, TEvent, TContext>,
  ): MachineState<TState, TContext> => {
    switch (action.type) {
      case "TRANSITION": {
        const currentTransitions = transitions[state.current];
        const eventType = action.event.type as TEvent["type"];
        const nextState = currentTransitions?.[eventType];

        if (!nextState) {
          // Invalid transition - log warning and stay in current state
          if (process.env.NODE_ENV === "development") {
            console.warn(`[StateMachine] Invalid transition: ${state.current} -> ${action.event.type}`);
          }
          return state;
        }

        return {
          current: nextState,
          context: action.newContext ? { ...state.context, ...action.newContext } : state.context,
          history: [...state.history, state.current],
        };
      }

      case "SET_CONTEXT": {
        return {
          ...state,
          context: { ...state.context, ...action.newContext },
        };
      }

      case "RESET": {
        return {
          current: action.initialState,
          context: action.initialContext,
          history: [],
        };
      }

      default:
        return state;
    }
  };

  const [machine, dispatch] = useReducer(reducer, {
    current: initialState,
    context: initialContext,
    history: [],
  });

  const send = useCallback((event: TEvent, newContext?: Partial<TContext>) => {
    dispatch({ type: "TRANSITION", event, newContext });
  }, []);

  const setContext = useCallback((newContext: Partial<TContext>) => {
    dispatch({ type: "SET_CONTEXT", newContext });
  }, []);

  const is = useCallback((state: TState) => machine.current === state, [machine.current]);

  const isAnyOf = useCallback((...states: TState[]) => states.includes(machine.current), [machine.current]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET", initialState, initialContext });
  }, [initialState, initialContext]);

  return {
    state: machine.current,
    send,
    context: machine.context,
    setContext,
    is,
    isAnyOf,
    reset,
    previousState: machine.history[machine.history.length - 1],
  };
}

/**
 * Helper to create a typed event
 * Useful for events with payloads
 *
 * @example
 * ```typescript
 * send(createEvent<FlowEvent>("ERROR", { message: "Something went wrong" }));
 * ```
 */
export function createEvent<TEvent extends MachineEvent>(type: TEvent["type"], payload?: Omit<TEvent, "type">): TEvent {
  return { type, ...payload } as TEvent;
}
