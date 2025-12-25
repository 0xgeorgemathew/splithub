"use client";

import { useEffect, useMemo, useState } from "react";
import { type User, supabase } from "~~/lib/supabase";

interface UseUserSearchOptions {
  /** Current user's wallet address to exclude from results */
  excludeWallet?: string;
  /** Whether the search is active (e.g., modal is open) */
  enabled?: boolean;
}

interface UseUserSearchReturn {
  /** Current search query */
  searchQuery: string;
  /** Set the search query */
  setSearchQuery: (query: string) => void;
  /** All users (unfiltered) */
  users: User[];
  /** Users filtered by search query */
  filteredUsers: User[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Hook for searching users with Twitter handle or name filtering.
 * Extracted from ExpenseModal user fetching logic.
 */
export function useUserSearch(options: UseUserSearchOptions = {}): UseUserSearchReturn {
  const { excludeWallet, enabled = true } = options;

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users from Supabase
  useEffect(() => {
    if (!enabled) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .not("chip_address", "is", null)
          .order("twitter_handle");

        if (fetchError) throw fetchError;

        // Filter out current user if wallet address provided
        const filtered = excludeWallet
          ? (data || []).filter(u => u.wallet_address.toLowerCase() !== excludeWallet.toLowerCase())
          : data || [];

        setUsers(filtered);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [enabled, excludeWallet]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(u => u.twitter_handle?.toLowerCase().includes(query) || u.name?.toLowerCase().includes(query));
  }, [users, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    users,
    filteredUsers,
    loading,
    error,
  };
}
