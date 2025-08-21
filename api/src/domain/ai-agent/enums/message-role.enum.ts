/**
 * Message Role Enum
 * Defines the role of the message sender in a conversation
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/**
 * Type guard to check if a value is a valid MessageRole
 */
export function isMessageRole(value: any): value is MessageRole {
  return Object.values(MessageRole).includes(value);
}

/**
 * Get display name for message role
 */
export function getMessageRoleDisplayName(role: MessageRole): string {
  const displayNames: Record<MessageRole, string> = {
    [MessageRole.USER]: 'User',
    [MessageRole.ASSISTANT]: 'AI Assistant',
    [MessageRole.SYSTEM]: 'System',
  };
  return displayNames[role];
}