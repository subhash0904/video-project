// URL helpers for consistent handling in Docker and development environments

/**
 * Get the base URL for streaming (HLS) content
 * In Docker with relative VITE_API_URL, use window.location.origin
 * In development, use the full API URL or localhost
 */
export function getStreamBaseUrl(): string {
  if (import.meta.env.VITE_STREAM_URL) {
    return import.meta.env.VITE_STREAM_URL;
  }
  
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.startsWith('/')) {
    // Docker deployment with relative URL
    return window.location.origin;
  }
  
  // Development with full URL
  return apiUrl?.replace('/api', '') || 'http://localhost:4000';
}

/**
 * Get the WebSocket base URL
 * In Docker, use window.location.origin for same-origin WebSocket
 */
export function getWebSocketUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.startsWith('/')) {
    return window.location.origin;
  }
  
  return apiUrl?.replace('/api', '') || 'http://localhost:4000';
}

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
}
