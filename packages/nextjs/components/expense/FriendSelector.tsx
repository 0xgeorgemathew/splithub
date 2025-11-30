"use client";

import { useEffect, useState } from "react";
import { Friend } from "./hooks/useExpenseForm";
import { Check, UserPlus, X } from "lucide-react";
import { isAddress } from "viem";

interface FriendSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (friend: Friend) => void;
  selectedFriends: Friend[];
}

// Mock data - in production, this would come from a database or smart contract
const SUGGESTED_FRIENDS: Friend[] = [
  { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", name: "Alice" },
  { address: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", name: "Bob" },
  { address: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", name: "Charlie" },
  { address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db", name: "Diana" },
];

export const FriendSelector = ({ isOpen, onClose, onSelectFriend, selectedFriends }: FriendSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [customAddress, setCustomAddress] = useState("");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredFriends = SUGGESTED_FRIENDS.filter(
    friend =>
      friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isFriendSelected = (address: string) => {
    return selectedFriends.some(f => f.address === address);
  };

  const handleAddCustomAddress = () => {
    if (isAddress(customAddress)) {
      onSelectFriend({ address: customAddress });
      setCustomAddress("");
      setSearchQuery("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-base-200 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-300">
          <h2 className="text-[18px] font-semibold text-base-content">Add Friends</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-base-300 hover:bg-base-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-5 border-b border-base-300">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or address..."
            className="w-full h-12 px-4 bg-base-100 rounded-[14px] text-[15px] text-base-content focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>

        {/* Friend list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {filteredFriends.length > 0 ? (
            filteredFriends.map(friend => {
              const isSelected = isFriendSelected(friend.address);
              return (
                <button
                  key={friend.address}
                  onClick={() => !isSelected && onSelectFriend(friend)}
                  disabled={isSelected}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-[14px] transition-all ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30 cursor-not-allowed"
                      : "bg-base-100 hover:bg-base-300 border border-transparent"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {friend.name ? friend.name.charAt(0).toUpperCase() : "?"}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-[15px] text-base-content">{friend.name || "Unknown"}</div>
                    <div className="text-[13px] font-mono text-base-content/50">
                      {friend.address.slice(0, 6)}...{friend.address.slice(-4)}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary-content" />
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4 shadow-md">
                <UserPlus className="w-8 h-8 text-base-content/50" />
              </div>
              <p className="text-base-content/50 text-[14px]">No friends found</p>
            </div>
          )}
        </div>

        {/* Add custom address */}
        <div className="p-5 border-t border-base-300">
          <div className="flex gap-2.5">
            <input
              type="text"
              value={customAddress}
              onChange={e => setCustomAddress(e.target.value)}
              placeholder="Or paste address (0x...)"
              className="flex-1 h-12 px-4 bg-base-100 rounded-[14px] text-[14px] text-base-content focus:outline-none focus:ring-2 focus:ring-primary/60 font-mono"
            />
            <button
              onClick={handleAddCustomAddress}
              disabled={!isAddress(customAddress)}
              className="h-12 px-5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-content font-medium text-[15px] rounded-[14px] transition-all"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
