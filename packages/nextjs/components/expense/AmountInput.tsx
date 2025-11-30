import { useEffect, useRef } from "react";
import { Coins } from "lucide-react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
}

export const AmountInput = ({ value, onChange, currency = "USDC" }: AmountInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow numbers and single decimal point
    if (inputValue === "" || /^\d*\.?\d{0,6}$/.test(inputValue)) {
      onChange(inputValue);
    }
  };

  const handleFocus = () => {
    inputRef.current?.select();
  };

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3.5">
        <label className="text-base font-medium text-base-content/70 flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary/80" />
          <span>Amount</span>
        </label>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-base-100 rounded-full border border-base-300/50">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-base-content/60">{currency}</span>
        </div>
      </div>

      <div className="bg-base-100 rounded-[15px] py-10 px-6 flex items-baseline justify-center gap-4 shadow-sm">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="0.00"
          className="flex-1 bg-transparent text-6xl font-bold text-base-content text-center focus:outline-none placeholder:text-base-content/15"
          style={{ caretColor: "#f2a900" }}
        />
        <span className="text-4xl font-bold text-primary">{currency}</span>
      </div>
    </div>
  );
};
