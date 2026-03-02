/**
 * Simple encryption for API keys in browser storage
 * Note: Keys are stored encrypted in Supabase, this is an additional layer
 */

// In production, set VITE_ENCRYPTION_KEY environment variable
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'prompt-forge-2024';

export function encryptKey(apiKey: string): string {
  // Simple XOR encryption (additional obfuscation layer)
  let encrypted = '';
  for (let i = 0; i < apiKey.length; i++) {
    const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    const apiChar = apiKey.charCodeAt(i);
    encrypted += String.fromCharCode(apiChar ^ keyChar);
  }
  return btoa(encrypted);
}

export function decryptKey(encrypted: string): string {
  const decoded = atob(encrypted);
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    const encChar = decoded.charCodeAt(i);
    decrypted += String.fromCharCode(encChar ^ keyChar);
  }
  return decrypted;
}

export function maskKey(apiKey: string): string {
  if (apiKey.length <= 8) return '****';
  return apiKey.slice(0, 4) + '****' + apiKey.slice(-4);
}
