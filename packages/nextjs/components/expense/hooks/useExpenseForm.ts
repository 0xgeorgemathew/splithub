import { useCallback, useMemo, useState } from "react";

export interface Friend {
  address: string;
  name?: string;
}

export interface ExpenseFormData {
  description: string;
  amount: string;
  selectedFriends: Friend[];
  currency: string;
}

export const useExpenseForm = () => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);

  const addFriend = useCallback((friend: Friend) => {
    setSelectedFriends(prev => {
      // Don't add duplicates
      if (prev.some(f => f.address === friend.address)) {
        return prev;
      }
      return [...prev, friend];
    });
  }, []);

  const removeFriend = useCallback((address: string) => {
    setSelectedFriends(prev => prev.filter(f => f.address !== address));
  }, []);

  const isValid = useMemo(() => {
    const amountNum = parseFloat(amount);
    return description.trim().length > 0 && selectedFriends.length > 0 && !isNaN(amountNum) && amountNum > 0;
  }, [description, amount, selectedFriends]);

  const participantCount = useMemo(() => {
    // +1 for the current user
    return selectedFriends.length + 1;
  }, [selectedFriends]);

  const reset = useCallback(() => {
    setDescription("");
    setAmount("");
    setSelectedFriends([]);
  }, []);

  return {
    description,
    setDescription,
    amount,
    setAmount,
    selectedFriends,
    addFriend,
    removeFriend,
    isValid,
    participantCount,
    reset,
  };
};
