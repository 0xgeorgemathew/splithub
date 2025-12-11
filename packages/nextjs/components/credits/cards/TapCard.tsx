"use client";

import { motion } from "framer-motion";
import { Nfc } from "lucide-react";
import { colors } from "~~/components/activity/styles";

interface TapCardProps {
  message: string;
}

export function TapCard({ message }: TapCardProps) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      {/* NFC icon with breathing pulse rings */}
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        {/* Breathing pulse rings - centered, animate outward */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 pointer-events-none"
            style={{
              borderColor: colors.processing.primary,
              width: 80,
              height: 80,
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.4 + i * 0.15, 1.7 + i * 0.15],
              opacity: [0, 0.6, 0.3, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Static NFC icon circle - no layoutId to prevent flying animation */}
        <div className="relative w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <Nfc className="w-10 h-10 text-primary" />
        </div>
      </div>

      {/* Message */}
      <h2 className="text-2xl font-black text-white tracking-tight mb-1">{message}</h2>
      <p className="text-sm text-gray-500">Hold your chip near the device</p>
    </div>
  );
}
