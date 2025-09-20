/**
 * Generate a UUID with fallback for mobile browsers that don't support crypto.randomUUID()
 */
export function generateUUID(): string {
  // Try to use the native crypto.randomUUID() first
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for mobile browsers or environments without crypto.randomUUID()
  // This generates a v4 UUID using Math.random()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
