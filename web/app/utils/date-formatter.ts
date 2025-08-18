/**
 * Date formatting utilities for consistent date display across the application
 */

/**
 * Format date to Japanese format with zero-padding (YYYY/MM/DD)
 * @param dateString - Date string or Date object to format
 * @returns Formatted date string (e.g., "2024/01/15")
 */
export const formatDateJP = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Check for invalid date
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}/${month}/${day}`;
};

/**
 * Format date to ISO date string (YYYY-MM-DD)
 * @param dateString - Date string or Date object to format
 * @returns ISO date string (e.g., "2024-01-15")
 */
export const formatDateISO = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Check for invalid date
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format date and time to Japanese format (YYYY/MM/DD HH:mm)
 * @param dateString - Date string or Date object to format
 * @returns Formatted date and time string (e.g., "2024/01/15 14:30")
 */
export const formatDateTimeJP = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Check for invalid date
  if (isNaN(date.getTime())) return '';
  
  const dateStr = formatDateJP(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes}`;
};

/**
 * Calculate days until a given date
 * @param dateString - Target date string or Date object
 * @returns Number of days until the date (negative if past)
 */
export const daysUntil = (dateString: string | Date | null | undefined): number | null => {
  if (!dateString) return null;
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Check for invalid date
  if (isNaN(date.getTime())) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Format relative date (e.g., "3日後", "昨日", "今日")
 * @param dateString - Date string or Date object to format
 * @returns Relative date string in Japanese
 */
export const formatRelativeDateJP = (dateString: string | Date | null | undefined): string => {
  const days = daysUntil(dateString);
  
  if (days === null) return '';
  
  if (days === 0) return '今日';
  if (days === 1) return '明日';
  if (days === -1) return '昨日';
  if (days > 0) return `${days}日後`;
  if (days < 0) return `${Math.abs(days)}日前`;
  
  return '';
};