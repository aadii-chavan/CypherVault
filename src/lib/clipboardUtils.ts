/**
 * Clipboard Utilities
 * 
 * This module provides basic clipboard operations
 */

import { logAuditEvent } from './auditLogger';

// Add debug logging function
function debugClipboard(message: string): void {
  if (typeof window !== 'undefined' && (window as any).__CYPHERVAULT_DEBUG) {
    console.log(`[ClipboardUtils] ${message}`);
  }
}

/**
 * Clipboard settings interface
 */
export interface ClipboardSettings {
  autoClear: boolean;
  clearTime: number; // in seconds
}

// Default clipboard settings
const DEFAULT_SETTINGS: ClipboardSettings = {
  autoClear: false,
  clearTime: 30
};

/**
 * Save clipboard settings to localStorage
 * @param userId User ID
 * @param settings Clipboard settings
 */
export async function saveClipboardSettings(
  userId: string,
  settings: ClipboardSettings
): Promise<void> {
  try {
    localStorage.setItem(`clipboard_settings_${userId}`, JSON.stringify(settings));
    debugClipboard(`Saved clipboard settings for user ${userId}`);
    
    // Log the event
    await logAuditEvent(
      userId,
      'clipboard_settings_update',
      'Updated clipboard settings'
    );
  } catch (error) {
    console.error('Error saving clipboard settings:', error);
    throw error;
  }
}

/**
 * Get clipboard settings from localStorage
 * @param userId User ID
 * @returns Clipboard settings
 */
export async function getClipboardSettings(
  userId: string
): Promise<ClipboardSettings> {
  try {
    const settingsJson = localStorage.getItem(`clipboard_settings_${userId}`);
    if (!settingsJson) {
      return DEFAULT_SETTINGS;
    }
    
    const settings = JSON.parse(settingsJson) as ClipboardSettings;
    debugClipboard(`Retrieved clipboard settings for user ${userId}`);
    return settings;
  } catch (error) {
    console.error('Error retrieving clipboard settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Copy text to clipboard
 * @param text Text to copy to clipboard
 * @param description Description of what was copied (for logging)
 * @param userId User ID for audit logging
 * @returns Whether the operation was successful
 */
export async function copyToClipboard(
  text: string,
  description: string = 'data',
  userId?: string
): Promise<boolean> {
  try {
    // Check if clipboard API is available
    if (!navigator.clipboard) {
      console.error('Clipboard API not available');
      return false;
    }
    
    // Copy text to clipboard
    await navigator.clipboard.writeText(text);
    debugClipboard(`Copied text to clipboard: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
    
    // Log the event if user ID is provided
    if (userId) {
      await logAuditEvent(
        userId,
        'clipboard_copy',
        `Copied ${description} to clipboard`
      );
      
      // Set up auto-clear if enabled
      const settings = await getClipboardSettings(userId);
      if (settings.autoClear && settings.clearTime > 0) {
        setTimeout(async () => {
          await clearClipboard(userId);
        }, settings.clearTime * 1000);
        debugClipboard(`Auto-clear scheduled in ${settings.clearTime} seconds`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Clear the clipboard
 * @param userId User ID for audit logging
 * @returns Whether the operation was successful
 */
export async function clearClipboard(userId?: string): Promise<boolean> {
  try {
    // Clear by writing empty string
    if (navigator.clipboard) {
      await navigator.clipboard.writeText('');
      debugClipboard('Clipboard cleared');
      
      // Log the event if user ID is provided
      if (userId) {
        await logAuditEvent(
          userId,
          'clipboard_clear',
          'Cleared clipboard'
        );
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing clipboard:', error);
    return false;
  }
}

// Check if Clipboard API is available
export function isClipboardAPIAvailable(): boolean {
  return !!navigator.clipboard && !!navigator.clipboard.writeText;
} 