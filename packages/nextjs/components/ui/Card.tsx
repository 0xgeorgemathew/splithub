/**
 * Card Compound Component
 *
 * A flexible card component using the compound component pattern.
 * Replaces components with many props (17+) with semantic composition.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Card.Header icon={<Shield />}>Token Approval</Card.Header>
 *   <Card.Body>
 *     <p>Approve tokens for payments</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button>Approve</Button>
 *   </Card.Footer>
 * </Card>
 *
 * // With variants
 * <Card variant="success">
 *   <Card.Header>Payment Complete</Card.Header>
 * </Card>
 * ```
 */
import { type HTMLAttributes, type ReactNode, createContext, forwardRef, useContext } from "react";

// =============================================================================
// TYPES
// =============================================================================

type CardVariant = "default" | "primary" | "success" | "error" | "processing";

interface CardContextValue {
  variant: CardVariant;
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// =============================================================================
// CONTEXT
// =============================================================================

const CardContext = createContext<CardContextValue | null>(null);

function useCardContext() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error("Card compound components must be used within a Card");
  }
  return context;
}

// =============================================================================
// VARIANT STYLES
// =============================================================================

const cardVariantStyles: Record<CardVariant, string> = {
  default: "bg-base-100 border-base-300 hover:border-primary/30",
  primary: "bg-primary/10 border-primary/50",
  success: "bg-success/10 border-success/50",
  error: "bg-error/10 border-error/50",
  processing: "bg-primary/10 border-primary/50 animate-pulse",
};

const iconVariantStyles: Record<CardVariant, string> = {
  default: "bg-base-200",
  primary: "bg-primary/20",
  success: "bg-success/20",
  error: "bg-error/20",
  processing: "bg-primary/20",
};

// =============================================================================
// CARD ROOT COMPONENT
// =============================================================================

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "default", className = "", ...props }, ref) => {
    const baseStyles = "card border-2 transition-all duration-300";
    const variantStyles = cardVariantStyles[variant];

    return (
      <CardContext.Provider value={{ variant }}>
        <div ref={ref} className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
          {children}
        </div>
      </CardContext.Provider>
    );
  },
);
CardRoot.displayName = "Card";

// =============================================================================
// CARD HEADER
// =============================================================================

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, icon, badge, className = "", ...props }, ref) => {
    const { variant } = useCardContext();
    const iconContainerStyles = iconVariantStyles[variant];

    return (
      <div ref={ref} className={`flex items-center justify-between p-6 pb-4 ${className}`} {...props}>
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconContainerStyles}`}>
              {icon}
            </div>
          )}
          <div>
            {typeof children === "string" ? (
              <h3 className="text-lg font-bold text-base-content">{children}</h3>
            ) : (
              children
            )}
          </div>
        </div>
        {badge}
      </div>
    );
  },
);
CardHeader.displayName = "Card.Header";

// =============================================================================
// CARD BODY
// =============================================================================

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(({ children, className = "", ...props }, ref) => {
  return (
    <div ref={ref} className={`px-6 pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
});
CardBody.displayName = "Card.Body";

// =============================================================================
// CARD FOOTER
// =============================================================================

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({ children, className = "", ...props }, ref) => {
  return (
    <div ref={ref} className={`px-6 pb-6 ${className}`} {...props}>
      {children}
    </div>
  );
});
CardFooter.displayName = "Card.Footer";

// =============================================================================
// EXPORT COMPOUND COMPONENT
// =============================================================================

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
