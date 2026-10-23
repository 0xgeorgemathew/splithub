/**
 * Input Validation Utilities
 *
 * Centralized validation logic for forms across the application.
 * Provides consistent error messages and input sanitization.
 */

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

/**
 * Application-wide validation limits
 * Adjust these values to change validation behavior across all forms
 */
export const VALIDATION_LIMITS = {
  /** Maximum expense amount in dollars */
  EXPENSE_AMOUNT_MAX: 10000,
  /** Minimum expense amount in dollars */
  EXPENSE_AMOUNT_MIN: 0.01,
  /** Maximum description length in characters */
  DESCRIPTION_MAX_LENGTH: 200,
  /** Maximum number of friends in an expense split */
  FRIENDS_MAX_COUNT: 20,
  /** Number of decimal places allowed for amounts */
  AMOUNT_DECIMAL_PLACES: 2,
} as const;

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Validation error type
 * Use this to provide field-specific error messages
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result type
 * null = valid, ValidationError = invalid
 */
export type ValidationResult = ValidationError | null;

// =============================================================================
// AMOUNT VALIDATION
// =============================================================================

/**
 * Validates an expense amount string
 *
 * @param amount - The amount string to validate
 * @returns ValidationError if invalid, null if valid
 *
 * @example
 * ```typescript
 * const error = validateExpenseAmount("10.50");
 * if (error) {
 *   console.log(error.message); // Show error to user
 * }
 * ```
 */
export function validateExpenseAmount(amount: string): ValidationResult {
  // Empty check
  if (!amount || amount.trim() === "") {
    return { field: "amount", message: "Amount is required" };
  }

  const num = parseFloat(amount);

  // Not a number
  if (isNaN(num)) {
    return { field: "amount", message: "Please enter a valid number" };
  }

  // Zero or negative
  if (num <= 0) {
    return { field: "amount", message: "Amount must be greater than 0" };
  }

  // Below minimum
  if (num < VALIDATION_LIMITS.EXPENSE_AMOUNT_MIN) {
    return {
      field: "amount",
      message: `Minimum amount is $${VALIDATION_LIMITS.EXPENSE_AMOUNT_MIN.toFixed(2)}`,
    };
  }

  // Above maximum
  if (num > VALIDATION_LIMITS.EXPENSE_AMOUNT_MAX) {
    return {
      field: "amount",
      message: `Amount cannot exceed $${VALIDATION_LIMITS.EXPENSE_AMOUNT_MAX.toLocaleString()}`,
    };
  }

  return null;
}

// =============================================================================
// DESCRIPTION VALIDATION
// =============================================================================

/**
 * Validates an expense description
 *
 * @param description - The description string to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateDescription(description: string): ValidationResult {
  const trimmed = description.trim();

  if (trimmed.length === 0) {
    return { field: "description", message: "Description is required" };
  }

  if (trimmed.length > VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH) {
    return {
      field: "description",
      message: `Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
    };
  }

  return null;
}

// =============================================================================
// FRIEND SELECTION VALIDATION
// =============================================================================

/**
 * Validates the friend selection for an expense
 *
 * @param count - Number of friends selected
 * @returns ValidationError if invalid, null if valid
 */
export function validateFriendSelection(count: number): ValidationResult {
  if (count === 0) {
    return { field: "friends", message: "Select at least one friend to split with" };
  }

  if (count > VALIDATION_LIMITS.FRIENDS_MAX_COUNT) {
    return {
      field: "friends",
      message: `Cannot split with more than ${VALIDATION_LIMITS.FRIENDS_MAX_COUNT} friends`,
    };
  }

  return null;
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitizes a number input string
 *
 * - Removes non-numeric characters (except decimal point)
 * - Limits to one decimal point
 * - Limits decimal places
 * - Removes leading zeros (except for "0.x" format)
 *
 * @param value - Raw input string
 * @returns Sanitized number string
 *
 * @example
 * ```typescript
 * sanitizeNumberInput("$10.555") // Returns "10.55"
 * sanitizeNumberInput("10..5")   // Returns "10.5"
 * sanitizeNumberInput("abc")     // Returns ""
 * ```
 */
export function sanitizeNumberInput(value: string): string {
  // Remove all non-numeric characters except decimal point
  let sanitized = value.replace(/[^0-9.]/g, "");

  // Handle multiple decimal points - keep only the first
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = parts[0] + "." + parts.slice(1).join("");
  }

  // Limit decimal places
  if (parts.length === 2 && parts[1]) {
    sanitized = parts[0] + "." + parts[1].slice(0, VALIDATION_LIMITS.AMOUNT_DECIMAL_PLACES);
  }

  // Remove leading zeros unless it's "0.something"
  if (sanitized.length > 1 && sanitized.startsWith("0") && !sanitized.startsWith("0.")) {
    sanitized = sanitized.replace(/^0+/, "");
  }

  return sanitized;
}

// =============================================================================
// FORM VALIDATION HELPERS
// =============================================================================

/**
 * Validates an entire expense form
 *
 * @returns Array of validation errors (empty if all valid)
 */
export function validateExpenseForm(data: {
  amount: string;
  description: string;
  friendCount: number;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const amountError = validateExpenseAmount(data.amount);
  if (amountError) errors.push(amountError);

  const descriptionError = validateDescription(data.description);
  if (descriptionError) errors.push(descriptionError);

  const friendsError = validateFriendSelection(data.friendCount);
  if (friendsError) errors.push(friendsError);

  return errors;
}

/**
 * Checks if a form can be submitted (no validation errors)
 *
 * @returns true if form is valid and can be submitted
 */
export function canSubmitExpenseForm(data: { amount: string; description: string; friendCount: number }): boolean {
  return validateExpenseForm(data).length === 0;
}
