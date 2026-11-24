/** Shared password validation used by SignUp and ResetPassword screens */

export const PASSWORD_MIN_LENGTH = 8;

const SPECIAL_CHAR_REGEX =
  /[@#$%&*\-=()?\/;:'"!~±×÷•°`´{}\]\[+_¥®\^€£©¡<>¢|\\¿,.]/;

/** Strips all whitespace from live password input */
export const sanitizePasswordInput = (text: string): string =>
  text.replace(/\s/g, "");

/**
 * Validates a new password.
 * Returns an error message, or "" when the password is valid.
 */
export const validatePassword = (
  password: string,
  requiredMessage: string = "Password is required",
): string => {
  if (!password) return requiredMessage;
  if (/\s/.test(password)) return "Password cannot contain spaces";

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(password);

  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Must be at least 8 characters";
  }
  if (!hasUppercase && !hasNumber && !hasSpecialChar) {
    return "Must have 1 uppercase letter, 1 number & 1 special character";
  }
  if (!hasUppercase && !hasSpecialChar) {
    return "Must have 1 uppercase letter & 1 special character";
  }
  if (!hasUppercase && !hasNumber) {
    return "Must have 1 uppercase letter & 1 number";
  }
  if (!hasNumber && !hasSpecialChar) {
    return "Must have 1 number & 1 special character";
  }
  if (!hasUppercase) return "Must have 1 uppercase letter";
  if (!hasNumber) return "Must have 1 number";
  if (!hasSpecialChar) return "Must have 1 special character";

  return "";
};

/**
 * Validates the confirm-password field against the password.
 * Returns an error message, or "" when valid.
 */
export const validateConfirmPassword = (
  confirmPassword: string,
  password: string,
): string => {
  if (!confirmPassword) return "Confirm password is required";
  if (/\s/.test(confirmPassword)) return "Confirm password cannot contain spaces";
  if (confirmPassword !== password) return "Passwords do not match";
  return "";
};