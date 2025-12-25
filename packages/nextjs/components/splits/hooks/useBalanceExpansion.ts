"use client";

import { useCallback, useState } from "react";

interface UseBalanceExpansionReturn {
  /** Whether the list is expanded */
  isExpanded: boolean;
  /** Expand the list */
  expand: () => void;
  /** Collapse the list */
  collapse: () => void;
  /** Toggle the expanded state */
  toggle: () => void;
}

/**
 * Hook for managing the expanded/collapsed state of the balance list.
 */
export function useBalanceExpansion(): UseBalanceExpansionReturn {
  const [isExpanded, setIsExpanded] = useState(false);

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);
  const toggle = useCallback(() => setIsExpanded(prev => !prev), []);

  return {
    isExpanded,
    expand,
    collapse,
    toggle,
  };
}
