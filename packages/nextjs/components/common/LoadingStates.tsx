"use client";

import { motion } from "framer-motion";
import { LucideIcon, Sparkles } from "lucide-react";

interface LoadingSpinnerProps {
  /** Optional message to display below the spinner */
  message?: string;
  /** Whether to use full height centering */
  fullHeight?: boolean;
}

/**
 * Animated loading spinner with optional message
 */
export function LoadingSpinner({ message, fullHeight = false }: LoadingSpinnerProps) {
  const containerClasses = fullHeight
    ? "min-h-[calc(100vh-160px)] flex items-center justify-center p-4"
    : "flex flex-col items-center justify-center py-20";

  return (
    <div className={containerClasses}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary/50" />
        </div>
      </motion.div>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-base-content/50 text-sm mt-4 font-medium"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

interface AuthPromptProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Message to display */
  message: string;
  /** Login button handler */
  onLogin: () => void;
  /** Optional button text */
  buttonText?: string;
}

/**
 * Authentication prompt with icon, message, and login button
 */
export function AuthPrompt({ icon: Icon, message, onLogin, buttonText = "Login with Twitter" }: AuthPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-5"
        >
          <Icon className="w-10 h-10 text-primary/50" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/60 text-lg mb-5 font-medium"
        >
          {message}
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogin}
          className="px-6 py-3 bg-primary text-primary-content font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
        >
          {buttonText}
        </motion.button>
      </div>
    </motion.div>
  );
}

interface ErrorDisplayProps {
  /** Error message to display */
  error: string;
  /** Retry button handler */
  onRetry: () => void;
  /** Optional retry button text */
  retryText?: string;
}

/**
 * Error display with retry button
 */
export function ErrorDisplay({ error, onRetry, retryText = "Try Again" }: ErrorDisplayProps) {
  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center mb-4"
        >
          <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </motion.div>
        <p className="text-error text-sm font-medium mb-4">{error}</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="px-5 py-2.5 bg-primary text-primary-content rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          {retryText}
        </motion.button>
      </motion.div>
    </div>
  );
}
