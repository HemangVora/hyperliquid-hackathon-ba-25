/**
 * API Client for Backend REST API
 *
 * Handles all HTTP requests to the backend API server.
 * Includes error handling, retries, and TypeScript type safety.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000');
const API_RETRY_COUNT = parseInt(process.env.NEXT_PUBLIC_API_RETRY_COUNT || '3');

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Standard API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Fetch options with timeout
 */
interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = API_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Retry logic for failed requests
 */
async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {},
  retries = API_RETRY_COUNT
): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, options);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.error?.code,
        errorData.error?.details
      );
    }

    return await response.json();
  } catch (error) {
    // Retry on network errors or 5xx status codes
    if (retries > 0 && (error instanceof TypeError || (error instanceof APIError && error.statusCode && error.statusCode >= 500))) {
      console.warn(`Request failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return fetchWithRetry<T>(url, options, retries - 1);
    }

    // Re-throw if out of retries
    if (error instanceof APIError) {
      throw error;
    }

    // Convert generic errors to APIError
    throw new APIError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

/**
 * Base API client class
 */
class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    // Add query parameters
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }

    return fetchWithRetry<T>(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return fetchWithRetry<T>(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return fetchWithRetry<T>(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return fetchWithRetry<T>(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();

/**
 * Health check utility
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get<{ status: string }>('/health');
    return response.status === 'healthy' || response.status === 'degraded';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}
