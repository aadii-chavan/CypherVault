/**
 * Input Sanitization and Validation Utilities
 * 
 * This module provides functions to sanitize and validate user inputs
 * to prevent XSS attacks and other security issues.
 */

// Valid characters for usernames (alphanumeric, underscore, hyphen, dot)
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

// Email validation regex - basic check, not comprehensive
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// URL validation regex - basic check
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;

/**
 * Sanitizes a string for safe display in HTML
 * 
 * @param input String to sanitize
 * @returns Sanitized string
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Safely renders text content
 * 
 * @param element DOM element to set text content on
 * @param text Text to set
 */
export function setTextContent(element: HTMLElement, text: string): void {
  if (!element) return;
  
  // Using textContent instead of innerHTML prevents XSS
  element.textContent = text;
}

/**
 * Validates an email address format
 * 
 * @param email Email to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Validates a URL format
 * 
 * @param url URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  return URL_REGEX.test(url);
}

/**
 * Validates a username format
 * 
 * @param username Username to validate
 * @returns True if valid, false otherwise
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  return USERNAME_REGEX.test(username);
}

/**
 * Sanitizes an object by escaping HTML in string properties
 * 
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Truncates a string to a maximum length and adds ellipsis if truncated
 * 
 * @param input String to truncate
 * @param maxLength Maximum allowed length
 * @returns Truncated string
 */
export function truncateString(input: string, maxLength: number): string {
  if (!input) return '';
  if (input.length <= maxLength) return input;
  
  return input.substring(0, maxLength) + '...';
}

/**
 * Validates a password against security requirements
 * 
 * @param password Password to validate
 * @returns Object with validation result and reason if invalid
 */
export function validatePassword(password: string): { 
  valid: boolean; 
  reason?: string;
} {
  if (!password) {
    return { valid: false, reason: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}

/**
 * Checks if an object contains valid properties
 * 
 * @param obj Object to validate
 * @param allowedProps Array of allowed property names
 * @returns True if valid, false otherwise
 */
export function hasValidProps(obj: Record<string, any>, allowedProps: string[]): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  const objProps = Object.keys(obj);
  
  // Check if all properties are in the allowed list
  return objProps.every(prop => allowedProps.includes(prop));
}

/**
 * Extracts sanitized parameters from an object
 * 
 * @param obj Object containing parameters
 * @param paramDefs Parameter definitions with validation functions
 * @returns Object with sanitized parameters or null if validation fails
 */
export function extractSanitizedParams<T>(
  obj: Record<string, any>,
  paramDefs: Record<string, (value: any) => boolean>
): T | null {
  if (!obj || typeof obj !== 'object') return null;
  
  const result: Record<string, any> = {};
  
  for (const [param, validator] of Object.entries(paramDefs)) {
    if (obj[param] !== undefined) {
      // Skip this parameter if it fails validation
      if (!validator(obj[param])) {
        return null;
      }
      
      // If it's a string, sanitize it
      if (typeof obj[param] === 'string') {
        result[param] = sanitizeHtml(obj[param]);
      } else {
        result[param] = obj[param];
      }
    }
  }
  
  return result as T;
} 