"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, LucideIcon, Power, PowerOff, Trash2 } from "lucide-react";

export interface RadialAction {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface RadialActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  triggerSize?: number;
}

const RADIUS = 32;
const ICON_SIZE = 24;
// Arc going to the RIGHT of the trigger (0° is right, so we go from -45° to 45°)
const START_ANGLE = -45;
const END_ANGLE = 45;

export const RadialActionMenu = ({
  isOpen,
  onClose,
  isActive,
  onToggleActive,
  onEdit,
  onDelete,
  triggerSize = 24,
}: RadialActionMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const actions: RadialAction[] = [
    {
      id: "toggle",
      icon: isActive ? PowerOff : Power,
      label: isActive ? "Deactivate" : "Activate",
      onClick: onToggleActive,
      variant: "default",
    },
    {
      id: "edit",
      icon: Edit3,
      label: "Edit",
      onClick: onEdit,
      variant: "default",
    },
    {
      id: "delete",
      icon: Trash2,
      label: "Delete",
      onClick: onDelete,
      variant: "danger",
    },
  ];

  const angleStep = (END_ANGLE - START_ANGLE) / (actions.length - 1);

  const getPosition = (index: number) => {
    const angle = START_ANGLE + index * angleStep;
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * RADIUS,
      y: Math.sin(radian) * RADIUS,
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleActionClick = (action: RadialAction) => {
    action.onClick();
    onClose();
  };

  return (
    <div ref={containerRef} className="relative" style={{ width: triggerSize, height: triggerSize }}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop blur layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              style={{ pointerEvents: "none" }}
            />

            {/* Radial action items */}
            <div
              className="absolute z-50"
              style={{
                top: triggerSize / 2,
                left: triggerSize / 2,
              }}
            >
              {actions.map((action, index) => {
                const position = getPosition(index);
                const Icon = action.icon;
                const isDanger = action.variant === "danger";

                return (
                  <motion.button
                    key={action.id}
                    initial={{
                      opacity: 0,
                      scale: 0.3,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: position.x,
                      y: position.y,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.3,
                      x: 0,
                      y: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      delay: index * 0.04,
                    }}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleActionClick(action);
                    }}
                    className={`
                      absolute flex items-center justify-center rounded-full shadow-lg
                      transition-colors duration-150
                      ${
                        isDanger
                          ? "bg-error/90 hover:bg-error text-error-content"
                          : "bg-base-200 hover:bg-base-300 text-base-content"
                      }
                    `}
                    style={{
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      marginLeft: -ICON_SIZE / 2,
                      marginTop: -ICON_SIZE / 2,
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    title={action.label}
                  >
                    <Icon className="w-3 h-3" strokeWidth={2.5} />
                  </motion.button>
                );
              })}
            </div>

            {/* Tooltip labels that appear on hover - rendered as aria-labels for accessibility */}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
