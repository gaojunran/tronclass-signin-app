/**
 * Check if the app is running in Tauri environment
 */
export function isTauri(): boolean {
  return !!(window as any).__TAURI__
}
