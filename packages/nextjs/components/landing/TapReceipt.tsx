"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nfc } from "lucide-react";

const PAPER = "#f3ede0";

type ReceiptLine = { time?: string; tag?: string; text: string; amount?: string };

// One tap, as the payment terminal would print it
const LINES: ReceiptLine[] = [
  { time: "14:02:11", tag: "TAP", text: "chip 0x7a3f…91c2" },
  { text: "owner 0x51d0…e4a8", amount: "found" },
  { time: "14:02:12", tag: "SIGN", text: "payment authorized", amount: "ok" },
  { time: "14:02:12", tag: "PAY", text: "wallet → Blockhouse Café", amount: "$18.50" },
  { text: "manager 90% · venue 10%" },
];

const LINE_INTERVAL = 650;
const HOLD_AFTER_PRINT = 4200;

export function TapReceipt() {
  const reduceMotion = useReducedMotion();
  const [printed, setPrinted] = useState(0);
  const [cycle, setCycle] = useState(0);

  const total = LINES.length + 1; // lines + footer block
  const visible = reduceMotion ? total : printed;

  useEffect(() => {
    if (reduceMotion) return;
    const delay = printed === 0 ? 900 : printed < total ? LINE_INTERVAL : HOLD_AFTER_PRINT;
    const timeout = setTimeout(() => {
      if (printed < total) {
        setPrinted(p => p + 1);
      } else {
        setPrinted(0);
        setCycle(c => c + 1);
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [printed, total, reduceMotion]);

  const tapping = !reduceMotion && printed === 1;

  return (
    <div
      role="figure"
      className="relative w-full max-w-[360px] h-[470px] mx-auto"
      aria-label="Example receipt for one tap payment"
    >
      {/* Reader head */}
      <div className="relative z-10 h-16 rounded-2xl bg-gradient-to-b from-[#333230] to-[#242322] border border-white/10 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] flex items-center justify-between px-5">
        <div className="relative w-9 h-9 flex items-center justify-center">
          <AnimatePresence>
            {tapping &&
              [0, 1, 2].map(i => (
                <motion.span
                  key={`${cycle}-${i}`}
                  initial={{ scale: 0.6, opacity: 0.7 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, delay: i * 0.18, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border border-primary"
                />
              ))}
          </AnimatePresence>
          <Nfc className={`w-6 h-6 transition-colors duration-300 ${tapping ? "text-primary" : "text-white/40"}`} />
        </div>
        <span className="font-jetbrains text-[10px] uppercase tracking-[0.2em] text-white/40">
          {visible === 0 ? "ready" : visible < total ? "printing" : "paid"}
        </span>
        <span
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            visible >= total ? "bg-success" : visible > 0 ? "bg-primary" : "bg-white/20"
          }`}
        />
      </div>

      {/* Paper slot */}
      <div className="relative z-10 mx-3 h-2 rounded-b-md bg-black/80" />

      {/* Paper */}
      <div className="absolute top-[68px] left-6 right-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={cycle}
            initial={{ y: -12 }}
            animate={{ y: 0 }}
            exit={{ y: 40, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } }}
            className="font-jetbrains text-[#1b1b1b]"
          >
            <div className="px-4 pt-5 pb-2 rounded-t-sm" style={{ background: PAPER }}>
              <div className="text-center leading-tight">
                <p className="m-0 text-[13px] font-bold tracking-[0.3em]">SPLITHUB</p>
                <p className="m-0 mt-1 text-[10px] text-[#1b1b1b]/60">Blockhouse Café · Base · USDC</p>
              </div>
              <div className="my-3 border-t border-dashed border-[#1b1b1b]/30" />

              {LINES.slice(0, visible).map((line, i) => (
                <motion.div
                  key={i}
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex items-baseline gap-2 py-[3px] text-[11px] leading-snug">
                    <span className="w-[54px] shrink-0 text-[#1b1b1b]/45">{line.time ?? ""}</span>
                    <span className="w-[40px] shrink-0 font-bold">{line.tag ?? ""}</span>
                    <span className="flex-1 truncate">{line.text}</span>
                    {line.amount && <span className="shrink-0 tabular-nums font-medium">{line.amount}</span>}
                  </div>
                </motion.div>
              ))}

              {visible >= total && (
                <motion.div
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="my-3 border-t border-dashed border-[#1b1b1b]/30" />
                  <div className="flex items-baseline justify-between text-[11px] font-bold">
                    <span>PAID FROM WALLET</span>
                    <span className="tabular-nums">$18.50</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-[#1b1b1b]/55 mt-1">
                    <span>held on the chip</span>
                    <span className="tabular-nums">$0.00</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Torn edge */}
            <div
              aria-hidden
              className="h-[10px]"
              style={{
                background: `linear-gradient(135deg, ${PAPER} 50%, transparent 50%) 0 0 / 12px 10px repeat-x, linear-gradient(225deg, ${PAPER} 50%, transparent 50%) 0 0 / 12px 10px repeat-x`,
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
