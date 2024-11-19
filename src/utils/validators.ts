/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param email Email to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object containing validation result and message
 */
export const validatePassword = (password: string): { 
  isValid: boolean; 
  message: string 
} => {
  if (password.length < 8) {
    return { 
      isValid: false, 
      message: 'Password must be at least 8 characters long' 
    };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one uppercase letter' 
    };
  }
  
  if (!/[0-9]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one number' 
    };
  }
  
  return { isValid: true, message: 'Password is valid' };
};

/**
 * Validate transaction amount
 * @param amount Amount to validate
 * @param balance Current balance
 * @returns Object containing validation result and message
 */
export const validateTransactionAmount = (
  amount: number,
  balance: number
): { 
  isValid: boolean; 
  message: string 
} => {
  if (amount <= 0) {
    return { 
      isValid: false, 
      message: 'Amount must be greater than 0' 
    };
  }
  
  if (amount > balance) {
    return { 
      isValid: false, 
      message: 'Insufficient funds' 
    };
  }
  
  return { isValid: true, message: 'Valid amount' };
}; 