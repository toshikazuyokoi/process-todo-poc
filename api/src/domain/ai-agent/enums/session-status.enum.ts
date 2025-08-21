/**
 * Session Status Enum
 * Represents the possible states of an AI interview session
 */
export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Type guard to check if a value is a valid SessionStatus
 */
export function isSessionStatus(value: any): value is SessionStatus {
  return Object.values(SessionStatus).includes(value);
}

/**
 * Get display name for session status
 */
export function getSessionStatusDisplayName(status: SessionStatus): string {
  const displayNames: Record<SessionStatus, string> = {
    [SessionStatus.ACTIVE]: 'Active',
    [SessionStatus.COMPLETED]: 'Completed',
    [SessionStatus.PAUSED]: 'Paused',
    [SessionStatus.EXPIRED]: 'Expired',
    [SessionStatus.CANCELLED]: 'Cancelled',
  };
  return displayNames[status];
}