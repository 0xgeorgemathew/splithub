"use client";

import { useCallback, useState } from "react";
import type { SplitsDefiPlan, SplitsDefiSnapshot } from "~~/services/splitsDefiPlannerService";

interface AiDefiPlanState {
  loading: boolean;
  data: {
    snapshot: SplitsDefiSnapshot;
    plan: SplitsDefiPlan;
    source: "llm" | "fallback";
    plannedAt: string;
  } | null;
  error: string | null;
}

export function useAiDefiPlan() {
  const [state, setState] = useState<AiDefiPlanState>({
    loading: false,
    data: null,
    error: null,
  });

  const fetchPlan = useCallback(async () => {
    setState({ loading: true, data: null, error: null });

    try {
      const res = await fetch("/api/splits/ai-defi-plan", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to generate plan");
      }

      setState({ loading: false, data: json, error: null });
    } catch (err) {
      setState({ loading: false, data: null, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, data: null, error: null });
  }, []);

  return {
    loading: state.loading,
    data: state.data,
    error: state.error,
    fetchPlan,
    reset,
  };
}
