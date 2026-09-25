/**
 * JANANI Local Offline API Client
 * Connects exclusively to the local AI backend (Mac/PC/Android on-device port 2004)
 * NO CLOUD, NO EXTERNAL NETWORK CALLS.
 */

// In development / emulator, Android connects via 10.0.2.2, iOS/Web via localhost
const DEFAULT_API_BASE = 'http://localhost:2004';

// AI pipeline (Whisper + IndicTrans2 + DhVaani) can take up to ~120s on CPU.
// Without this timeout the browser silently drops the connection → "fail to get".
const FETCH_TIMEOUT_MS = 120_000;

let currentBaseUrl = DEFAULT_API_BASE;

export function setApiBaseUrl(url: string) {
  currentBaseUrl = url.trim().replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. The AI pipeline is still processing — please try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function localFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1,
): Promise<T> {
  const url = `${currentBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const doFetch = async (): Promise<T> => {
    const response = await fetchWithTimeout(url, { ...options, headers }, FETCH_TIMEOUT_MS);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `Server error (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error || parsed.detail || errorMsg;
      } catch {
        errorMsg = errorBody || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return await response.json() as T;
  };

  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await doFetch();
    } catch (err: any) {
      lastErr = err;
      const isNetworkError =
        err.message?.includes('Network request failed') ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError');

      // Only retry on transient network errors, not on timeouts or API errors
      if (isNetworkError && attempt < retries) {
        console.warn(`[JANANI] Network error on attempt ${attempt + 1}, retrying...`);
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }

      if (isNetworkError) {
        throw new Error(
          'Local AI backend unreachable. Please ensure the JANANI offline server is running on port 2004.'
        );
      }
      throw err;
    }
  }

  throw lastErr;
}

