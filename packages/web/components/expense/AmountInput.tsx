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

    // Only allow numbers and single decimal point (max 2 decimals)
    if (inputValue === "" || /^\d*\.?\d{0,2}$/.test(inputValue)) {
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
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-base-content/70 flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-primary/80" />
          <span>Amount</span>
        </label>
      </div>

      <div className="bg-base-200 rounded-lg py-3 px-4 flex items-baseline justify-center gap-2 overflow-hidden">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="0.00"
          className="w-auto min-w-[80px] max-w-[200px] bg-transparent text-4xl font-bold text-base-content text-center focus:outline-none placeholder:text-base-content/15"
          style={{ caretColor: "#f2a900" }}
        />
        <span className="text-2xl font-bold text-primary flex-shrink-0">{currency}</span>
      </div>
    </div>
  );
};
