"use client";

import { type HTMLAttributes, type ReactNode, createContext, forwardRef, useContext, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { SPRING_CONFIGS, TWEEN_CONFIGS } from "~~/constants/app.constants";

// =============================================================================
// TYPES
// =============================================================================

type ModalSize = "sm" | "md" | "lg" | "xl" | "fullscreen";

interface ModalContextValue {
  onClose?: () => void;
  size: ModalSize;
}

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  size?: ModalSize;
  /** If true, renders as fullscreen overlay (useful for processing states) */
  fullscreen?: boolean;
  /** If true, clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** If true, pressing Escape closes modal */
  closeOnEscape?: boolean;
}

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** If true, shows close button */
  showClose?: boolean;
}

interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("Modal compound components must be used within a Modal");
  }
  return context;
}

// =============================================================================
// SIZE STYLES
// =============================================================================

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  fullscreen: "w-full h-full max-w-none rounded-none",
};

// =============================================================================
// MODAL ROOT COMPONENT
// =============================================================================

function ModalRoot({
  children,
  isOpen,
  onClose,
  size = "md",
  fullscreen = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  const effectiveSize: ModalSize = fullscreen ? "fullscreen" : size;

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !onClose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleBackdropClick = () => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalContext.Provider value={{ onClose, size: effectiveSize }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TWEEN_CONFIGS.backdrop}
            onClick={handleBackdropClick}
            className={`fixed inset-0 z-50 flex items-center justify-center ${
              fullscreen ? "bg-base-300/95 backdrop-blur-md" : "bg-black/50 backdrop-blur-sm p-4"
            }`}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={SPRING_CONFIGS.smooth}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={`w-full ${sizeStyles[effectiveSize]} ${
                fullscreen ? "flex items-center justify-center" : "bg-base-100 rounded-3xl shadow-2xl overflow-hidden"
              }`}
            >
              {fullscreen ? <div className="w-full max-w-md px-4">{children}</div> : children}
            </motion.div>
          </motion.div>
        </ModalContext.Provider>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// MODAL HEADER
// =============================================================================

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, showClose = true, className = "", ...props }, ref) => {
    const { onClose } = useModalContext();

    return (
      <div ref={ref} className={`flex items-center justify-between p-6 pb-4 ${className}`} {...props}>
        {typeof children === "string" ? <h2 className="text-xl font-bold text-base-content">{children}</h2> : children}
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-base-200 hover:bg-base-300 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-base-content/60" />
          </button>
        )}
      </div>
    );
  },
);
ModalHeader.displayName = "Modal.Header";

// =============================================================================
// MODAL BODY
// =============================================================================

const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(({ children, className = "", ...props }, ref) => {
  return (
    <div ref={ref} className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
});
ModalBody.displayName = "Modal.Body";

// =============================================================================
// MODAL FOOTER
// =============================================================================

const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(({ children, className = "", ...props }, ref) => {
  return (
    <div ref={ref} className={`flex items-center justify-end gap-3 p-6 pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
});
ModalFooter.displayName = "Modal.Footer";

// =============================================================================
// EXPORT COMPOUND COMPONENT
// =============================================================================

export const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});
