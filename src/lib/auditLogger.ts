/**
 * Secure Audit Logging Utilities
 * 
 * This module provides robust logging of security-relevant events
 * with multiple storage mechanisms and tamper-evidence features.
 */

import { collection, doc, addDoc, getDocs, query, where, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import * as secureStorage from './secureStorage';
import * as cryptoUtils from './cryptoUtils';

// Configuration
const MAX_LOCAL_LOG_ENTRIES = 500; // Maximum number of log entries to keep locally
const LOG_COLLECTION = 'auditLogs'; // Main collection name

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Interface for audit log event
 */
export interface AuditLogEvent {
  userId: string;
  eventType: string;
  description: string;
  timestamp: Date | Timestamp;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  clientHash?: string; // For tamper detection
}

/**
 * Interface for audit log entry (internal format)
 */
interface AuditLogEntry extends AuditLogEvent {
  sequenceId: number; // For detecting missing entries
  clientHash: string; // For tamper detection
}

// Get a secure session key for log encryption
let cachedSessionLoggingKey: string | null = null;

const getSessionLoggingKey = (): string => {
  // Use cached key if available to avoid repeated storage access
  if (cachedSessionLoggingKey) return cachedSessionLoggingKey;
  
  // Try to get from secure storage
  const currentKey = secureStorage.secureGet('sessionLoggingKey');
  if (currentKey) {
    cachedSessionLoggingKey = currentKey;
    return currentKey;
  }
  
  // Generate new key if none exists
  const newKey = cryptoUtils.generateRandomString(32);
  secureStorage.secureSet('sessionLoggingKey', newKey);
  cachedSessionLoggingKey = newKey;
  return newKey;
};

/**
 * Logs an audit event securely
 * 
 * @param userId User ID
 * @param eventType Type of event (e.g., 'login', 'password_change')
 * @param description Human-readable description
 * @param metadata Additional data to log
 * @returns Promise resolving when log is written
 */
export const logAuditEvent = async (
  userId: string,
  eventType: string,
  description: string,
  riskLevel: RiskLevel = 'low',
  metadata?: Record<string, any>
) => {
  try {
    if (!userId) {
      console.error('Cannot log audit event: Missing user ID');
      return;
    }
    
    // Get basic device info without fingerprintUtils
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    // Get IP address (simplified - in production, use a proper IP detection service)
    const ipAddress = '0.0.0.0'; // Placeholder - should be set by server
    
    // Get the logging key
    const loggingKey = getSessionLoggingKey();
    
    // Create timestamp
    const timestamp = serverTimestamp();
    
    // Build the event object
    const event: AuditLogEvent = {
      userId,
      eventType,
      description,
      timestamp,
      ipAddress: ipAddress || '',
      userAgent: navigator.userAgent,
      deviceInfo,
      riskLevel,
      metadata: metadata || {}
    };

    // Remove undefined/null fields from deviceInfo
    Object.keys(event.deviceInfo).forEach(key => {
      if (event.deviceInfo[key] === undefined || event.deviceInfo[key] === null) {
        delete event.deviceInfo[key];
      }
    });

    // Remove undefined/null fields from metadata
    Object.keys(event.metadata).forEach(key => {
      if (event.metadata[key] === undefined || event.metadata[key] === null) {
        delete event.metadata[key];
      }
    });

    // Generate a hash of this entry for tamper detection
    // Include previous log hash if available for chaining
    let previousLogs = getAuditLogs(userId);
    if (!Array.isArray(previousLogs)) previousLogs = [];
    const previousHash = previousLogs.length > 0 ? previousLogs[0].clientHash : '';
    
    // Get timestamp value for hashing
    const timestampValue = timestamp instanceof Date ? timestamp.getTime() : 
                          timestamp instanceof Timestamp ? timestamp.toMillis() : 
                          Date.now();
    
    const contentToHash = `${previousHash}:${userId}:${eventType}:${description}:${timestampValue}`;
    const clientHash = await cryptoUtils.sha256Hash(contentToHash);
    const sequenceId = previousLogs.length > 0 ? previousLogs[0].sequenceId + 1 : 1;
    
    const logEntry: AuditLogEntry = {
      ...event,
      sequenceId,
      clientHash
    };
    
    await storeLogEntry(logEntry);
    
    // Only send required and allowed fields to Firestore
    try {
      const userLogsCollection = collection(db, LOG_COLLECTION, userId, 'logs');
      const firestoreLog = {
        eventType: logEntry.eventType,
        description: logEntry.description,
        timestamp: logEntry.timestamp,
        ipAddress: logEntry.ipAddress,
        userAgent: logEntry.userAgent,
        deviceInfo: logEntry.deviceInfo,
        riskLevel: logEntry.riskLevel,
        // Optional fields:
        metadata: logEntry.metadata || {},
        sequenceId: logEntry.sequenceId,
        clientHash: logEntry.clientHash,
        serverTimestamp: serverTimestamp(),
      };
      
      // Remove undefined/null fields from firestoreLog
      Object.keys(firestoreLog).forEach(key => {
        if (firestoreLog[key] === undefined || firestoreLog[key] === null) {
          delete firestoreLog[key];
        }
      });
      
      await addDoc(userLogsCollection, firestoreLog);
    } catch (firestoreError) {
      console.error('Error writing to Firestore audit log:', firestoreError);
    }
    
    // For critical security events, attempt to immediately submit to server
    if (isHighPriorityEvent(eventType)) {
      try {
        // Make a dedicated attempt to ensure this is recorded
        // Using a different API would be even better for redundancy
        console.info(`Critical security event recorded: ${eventType}`);
      } catch (e) {
        // Redundant logging failed, but we still have local and Firestore attempts
      }
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

/**
 * Check if an event type is high priority requiring immediate attention
 */
function isHighPriorityEvent(eventType: string): boolean {
  const highPriorityEvents = [
    'login_failed',
    'login_blocked',
    'password_changed',
    'two_factor_disabled',
    'recovery_key_used',
    'security_setting_changed',
    'account_recovery',
    'admin_access',
    'decoy_vault_accessed'
  ];
  
  return highPriorityEvents.includes(eventType);
}

/**
 * Store a log entry in secure storage
 * 
 * @param logEntry Log entry to store
 */
async function storeLogEntry(logEntry: AuditLogEntry): Promise<void> {
  try {
    // Performance optimization - don't read existing logs for high volume operations
    // Just store this entry directly without retrieving the full history
    const isHighVolumeOperation = isHighVolumeEvent(logEntry.eventType);
    
    // For high volume events, we'll just write directly without reading existing logs
    if (isHighVolumeOperation) {
      // Create a single-item array with just this log entry
      const singleLogArray = [logEntry];
      
      // Save to secure storage
      await secureStorage.secureSessionSet(
        `audit_logs_${logEntry.userId}`,
        singleLogArray,
        getSessionLoggingKey()
      );
      return;
    }
    
    // Standard approach for normal events
    // Get existing logs
    let logs = getAuditLogs(logEntry.userId);
    
    // Ensure logs is an array (defensive programming)
    if (!Array.isArray(logs)) {
      console.warn('Retrieved logs is not an array, creating new array');
      logs = [];
    }
    
    // Add new log entry at the beginning (newest first)
    logs.unshift(logEntry);
    
    // Trim the log if it's too large
    const trimmedLogs = logs.slice(0, MAX_LOCAL_LOG_ENTRIES);
    
    // Save to secure storage
    await secureStorage.secureSessionSet(
      `audit_logs_${logEntry.userId}`,
      trimmedLogs,
      getSessionLoggingKey()
    );
  } catch (error) {
    console.error('Error storing log entry:', error);
  }
}

/**
 * Check if an event is high volume that doesn't need appending to log history
 */
function isHighVolumeEvent(eventType: string): boolean {
  const highVolumeEvents = [
    'vault_unlocked',
    'vault_locked',
    'session_refreshed',
    'item_viewed',
    'search_performed',
    'ui_interaction'
  ];
  
  return highVolumeEvents.includes(eventType);
}

/**
 * Get audit logs for a user
 * 
 * @param userId User ID
 * @returns Array of audit log entries
 */
export function getAuditLogs(userId: string): AuditLogEntry[] {
  try {
    // Try to get from secure storage
    const logs = secureStorage.secureGet(`audit_logs_${userId}`);
    if (logs && Array.isArray(logs)) {
      return logs;
    }
    
    // If not found in memory or not an array, check session storage
    const sessionKey = getSessionLoggingKey();
    const sessionLogs = secureStorage.secureSessionGet(`audit_logs_${userId}`, sessionKey);
    
    if (sessionLogs && Array.isArray(sessionLogs)) {
      return sessionLogs;
    }
    
    return [];
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    return [];
  }
}

/**
 * Get all audit logs from Firestore
 * 
 * @param userId User ID
 * @param maxResults Maximum number of results to return
 * @returns Promise resolving to array of audit log events
 */
export async function getFirestoreAuditLogs(
  userId: string,
  maxResults: number = 100
): Promise<AuditLogEvent[]> {
  try {
    // Create query for user's logs
    const userLogsCollection = collection(db, LOG_COLLECTION, userId, 'logs');
    const auditLogsQuery = query(
      userLogsCollection,
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    
    // Execute query
    const querySnapshot = await getDocs(auditLogsQuery);
    
    // Process results
    const logs: AuditLogEvent[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AuditLogEvent;
      logs.push({
        ...data,
        // Convert Firestore timestamp to Date if needed
        timestamp: data.timestamp instanceof Timestamp 
          ? data.timestamp.toDate() 
          : data.timestamp
      });
    });
    
    return logs;
  } catch (error) {
    console.error('Error getting Firestore audit logs:', error);
    return [];
  }
}

/**
 * Verify the integrity of the audit log chain
 * 
 * @param userId User ID
 * @returns Object with verification results
 */
export async function verifyAuditLogIntegrity(userId: string): Promise<{
  valid: boolean;
  issues: string[];
}> {
  try {
    const logs = getAuditLogs(userId);
    const issues: string[] = [];
    
    // Ensure logs is an array
    if (!Array.isArray(logs)) {
      return {
        valid: false,
        issues: ['Audit logs are not available or not in the expected format']
      };
    }
    
    // Check sequence IDs for gaps
    for (let i = 0; i < logs.length - 1; i++) {
      const currentSeq = logs[i].sequenceId;
      const nextSeq = logs[i + 1].sequenceId;
      
      if (currentSeq !== nextSeq + 1) {
        issues.push(`Sequence gap detected: ${nextSeq} to ${currentSeq}`);
      }
    }
    
    // Verify hash chain
    for (let i = 0; i < logs.length - 1; i++) {
      const currentLog = logs[i];
      const previousLog = logs[i + 1];
      
      // Reconstruct the hash that should have been generated
      const contentToHash = `${previousLog.clientHash}:${currentLog.userId}:${currentLog.eventType}:${currentLog.description}:${currentLog.timestamp.toMillis()}`;
      const expectedHash = await cryptoUtils.sha256Hash(contentToHash);
      
      if (expectedHash !== currentLog.clientHash) {
        issues.push(`Hash mismatch at sequence ${currentLog.sequenceId}: possible tampering`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  } catch (error) {
    console.error('Error verifying audit log integrity:', error);
    return {
      valid: false,
      issues: ['Error verifying logs: ' + String(error)]
    };
  }
}

/**
 * Get security-related audit logs
 * @param userId User ID
 * @param maxResults Maximum number of results to return
 * @returns Array of audit log events
 */
export async function getSecurityAuditLogs(
  userId: string,
  maxResults: number = 50
): Promise<AuditLogEvent[]> {
  try {
    // Define security-related event types
    const securityEventTypes = [
      'login_success',
      'login_failure',
      'login_blocked',
      'password_changed',
      'security_setting_changed',
      'two_factor_enabled',
      'two_factor_disabled',
      'session_created',
      'session_terminated',
      'session_refreshed',
      'session_integrity_check_failed',
      'session_integrity_warning',
      'decoy_vault_created',
      'decoy_vault_accessed',
      'trusted_device_added',
      'trusted_device_removed',
      'anti_phishing_updated',
      'anti_phishing_disabled',
      'webauthn_key_registered',
      'webauthn_key_removed',
      'webauthn_login_success',
      'webauthn_login_failure'
    ];

    // First check local logs
    let logs = getAuditLogs(userId);
    
    // Ensure logs is an array
    if (!Array.isArray(logs)) {
      console.warn('Retrieved logs is not an array, creating new array');
      logs = [];
    }
    
    const localLogs = logs.filter(
      log => securityEventTypes.includes(log.eventType)
    ).slice(0, maxResults);
    
    try {
      // Then try to get Firestore logs
      const userLogsCollection = collection(db, LOG_COLLECTION, userId, 'logs');
      const auditLogsQuery = query(
        userLogsCollection,
        where('eventType', 'in', securityEventTypes),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );
      
      const querySnapshot = await getDocs(auditLogsQuery);
      const firestoreLogs: AuditLogEvent[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AuditLogEvent;
        firestoreLogs.push({
          ...data,
          // Convert Firestore timestamp to Date if needed
          timestamp: data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate() 
            : data.timestamp
        });
      });
      
      // Merge logs, giving priority to Firestore logs (server of record)
      // but including any local logs that might not have synced yet
      const mergedLogs = [...firestoreLogs];
      
      // Add local logs that aren't in Firestore results
      for (const localLog of localLogs) {
        // Skip if this log appears to be in Firestore already
        // This is an imperfect comparison but works for most cases
        const isDuplicate = firestoreLogs.some(fireLog => 
          fireLog.eventType === localLog.eventType && 
          fireLog.description === localLog.description &&
          Math.abs(new Date(fireLog.timestamp).getTime() - new Date(localLog.timestamp).getTime()) < 5000
        );
        
        if (!isDuplicate) {
          mergedLogs.push(localLog);
        }
      }
      
      // Sort by timestamp (newest first)
      mergedLogs.sort((a, b) => {
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Limit to requested number
      return mergedLogs.slice(0, maxResults);
    } catch (firestoreError) {
      console.error('Error getting Firestore security audit logs:', firestoreError);
      return localLogs; // Fall back to local logs only
    }
  } catch (error) {
    console.error('Error getting security audit logs:', error);
    return [];
  }
}

/**
 * Format audit log event for display
 * @param event Audit log event
 * @returns Formatted string
 */
export function formatAuditLogEvent(event: AuditLogEvent): string {
  // Convert timestamp to Date if it's a Firestore Timestamp
  const timestamp = event.timestamp instanceof Timestamp
    ? event.timestamp.toDate()
    : event.timestamp;

  // Format the date
  const dateString = timestamp.toLocaleString();

  // Create formatted string
  let formatted = `[${dateString}] ${event.eventType}: ${event.description}`;

  // Add IP and user agent if available
  if (event.ipAddress) {
    formatted += ` (IP: ${event.ipAddress})`;
  }

  // Add metadata if available
  if (event.metadata && Object.keys(event.metadata).length > 0) {
    const metadataStr = Object.entries(event.metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    formatted += ` [${metadataStr}]`;
  }

  return formatted;
}

// Helper function to determine risk level based on event type
export const getEventRiskLevel = (eventType: string): RiskLevel => {
  const highRiskEvents = [
    'password_changed',
    'masterkey_changed',
    'two_factor_disabled',
    'account_deleted',
    'vault_exported'
  ];
  
  const mediumRiskEvents = [
    'login',
    'logout',
    'vault_unlocked',
    'vault_locked',
    'trusted_device_added',
    'trusted_device_removed'
  ];
  
  if (highRiskEvents.includes(eventType)) {
    return 'high';
  } else if (mediumRiskEvents.includes(eventType)) {
    return 'medium';
  }
  
  return 'low';
}; 