"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const usePaymentNotification = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const pendingAmountRef = useRef<string | number | null>(null);
  const isUnlockedRef = useRef(false);

  useEffect(() => {
    // Preload the sound
    audioRef.current = new Audio("/sounds/success_bell.mp3");
    audioRef.current.load();

    // Load voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Call this on user gesture (TAP TO PAY button) to unlock audio on mobile
  const prime = useCallback((amount: string | number) => {
    pendingAmountRef.current = amount;

    // Unlock audio by playing silent/muted then pausing immediately
    if (audioRef.current && !isUnlockedRef.current) {
      const audio = audioRef.current;
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.muted = false;
          audio.currentTime = 0;
          isUnlockedRef.current = true;
        })
        .catch(() => {
          // Ignore errors during prime
        });
    }

    // Prime speech synthesis with empty utterance
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const emptyUtterance = new SpeechSynthesisUtterance("");
      emptyUtterance.volume = 0;
      window.speechSynthesis.speak(emptyUtterance);
    }
  }, []);

  const playNotification = useCallback(
    (amount: string | number) => {
      // Use passed amount or fall back to primed amount
      const finalAmount = amount ?? pendingAmountRef.current ?? "0";

      // 1. Play the bell
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch(() => {});
      }

      // 2. Speak the amount
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const text = `${finalAmount} U.S.D.C Received on Split Hub`;
        const utterance = new SpeechSynthesisUtterance(text);

        const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();

        // Voice selection priority for Indian accent:
        // 1. iOS: "Rishi" (en-IN) - Indian English male
        // 2. Android: "English India" (en_IN)
        // 3. Any en-IN voice
        // 4. Fallback to any English voice
        const findVoice = () => {
          // iOS Rishi (Indian English)
          const rishi = availableVoices.find(v => v.name === "Rishi");
          if (rishi) return rishi;

          // Android English India - flexible matching
          const androidIndian = availableVoices.find(v => {
            const name = v.name.toLowerCase();
            const lang = v.lang.toLowerCase().replace("_", "-");
            return (name.includes("english") && name.includes("india")) || lang === "en-in";
          });
          if (androidIndian) return androidIndian;

          // Any en-IN voice (normalize underscore to hyphen)
          const anyIndian = availableVoices.find(v => {
            const lang = v.lang.toLowerCase().replace("_", "-");
            return lang === "en-in";
          });
          if (anyIndian) return anyIndian;

          // Fallback to any English
          return availableVoices.find(v => v.lang.toLowerCase().startsWith("en"));
        };

        const selectedVoice = findVoice();
        if (selectedVoice) utterance.voice = selectedVoice;

        // Set language explicitly for Indian English (BCP-47 format)
        utterance.lang = "en-IN";
        utterance.pitch = 1.1;
        utterance.rate = 0.9;
        utterance.volume = 1.1;

        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 600);
      }

      // Clear pending
      pendingAmountRef.current = null;
    },
    [voices],
  );

  return { playNotification, prime };
};
