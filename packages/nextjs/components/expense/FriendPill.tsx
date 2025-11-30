import { X } from "lucide-react";

interface FriendPillProps {
  address: string;
  name?: string;
  onRemove: () => void;
}

export const FriendPill = ({ address, name, onRemove }: FriendPillProps) => {
  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="inline-flex items-center gap-2.5 pl-2 pr-2.5 py-2 bg-base-100 border border-base-300/60 rounded-full shadow-sm hover:shadow transition-shadow">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
      </div>
      <span className="text-[14px] font-medium text-base-content pr-1">{displayName}</span>
      <button
        onClick={onRemove}
        className="w-5 h-5 rounded-full bg-base-200 hover:bg-error/10 flex items-center justify-center transition-colors"
        aria-label="Remove friend"
      >
        <X className="w-3.5 h-3.5 text-base-content/60 hover:text-error transition-colors" />
      </button>
    </div>
  );
};
