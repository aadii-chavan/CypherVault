import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a base64URL string to an ArrayBuffer
 * This is needed for WebAuthn operations
 */
export function base64URLToBuffer(base64URL: string): ArrayBuffer {
  // Convert base64URL to base64
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  
  // Convert to binary string
  const binary = window.atob(padded);
  
  // Convert to ArrayBuffer
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return buffer;
}

/**
 * Convert an ArrayBuffer to a base64URL string
 * This is needed for WebAuthn operations
 */
export function bufferToBase64URL(buffer: ArrayBuffer): string {
  // Convert ArrayBuffer to binary string
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Convert to base64
  const base64 = window.btoa(binary);
  
  // Convert to base64URL
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
