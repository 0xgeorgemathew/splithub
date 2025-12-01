"use client";

import { useEffect, useState } from "react";
import { Friend } from "./hooks/useExpenseForm";
import { Check, Search, X } from "lucide-react";
import { type User, supabase } from "~~/lib/supabase";

interface FriendSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (friend: Friend) => void;
  selectedFriends: Friend[];
}

export const FriendSelector = ({ isOpen, onClose, onSelectFriend, selectedFriends }: FriendSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch users from Supabase
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("users").select("*").order("name");

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      // Prevent zoom on iOS
      document.body.style.touchAction = "none";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(user => user.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const isFriendSelected = (address: string) => {
    return selectedFriends.some(f => f.address === address);
  };

  const handleSelectUser = (user: User) => {
    const isSelected = isFriendSelected(user.wallet_address);
    if (!isSelected) {
      onSelectFriend({ address: user.wallet_address, name: user.name });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-base-200 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] flex flex-col mb-0 sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300/50">
          <h2 className="text-[20px] font-semibold text-base-content">Add Friends</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-base-300/50 hover:bg-base-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-base-content" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-base-300/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              autoFocus
              className="w-full h-11 pl-9 pr-3 bg-base-100 rounded-xl text-sm text-base-content placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-1">
              {filteredUsers.map(user => {
                const isSelected = isFriendSelected(user.wallet_address);
                return (
                  <button
                    key={user.wallet_address}
                    onClick={() => handleSelectUser(user)}
                    disabled={isSelected}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                      isSelected
                        ? "bg-primary/15 border border-primary/40 cursor-default"
                        : "bg-base-100/50 hover:bg-base-100 active:bg-base-300/50"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                    </div>

                    {/* User info */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-sm text-base-content truncate">{user.name}</div>
                      <div className="text-xs font-mono text-base-content/50 truncate">
                        {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? "bg-primary" : "bg-base-200 border-2 border-base-content/20"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-content" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-base-100 flex items-center justify-center mb-2">
                <Search className="w-6 h-6 text-base-content/30" />
              </div>
              <p className="text-sm text-base-content/50">
                {searchQuery ? "No users found" : "Start typing to search"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-base-300/50">
          <button
            onClick={onClose}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-content font-semibold text-sm rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
