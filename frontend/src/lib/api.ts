// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ============================================
// API Client
// ============================================

class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('accessToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Something went wrong');
    }

    // Return full response (includes data and meta for pagination)
    return data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Do NOT set Content-Type — browser sets multipart boundary automatically
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Upload failed');
    }
    return data;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// ============================================
// API Methods
// ============================================

// Auth
export const authApi = {
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
  }) => apiClient.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),

  getCurrentUser: () => apiClient.get('/auth/me'),

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
};

// Videos
export const videosApi = {
  getFeed: (params?: { page?: number; limit?: number; type?: string; category?: string }) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/videos/feed?${query}`);
  },

  getVideoById: (id: string) => apiClient.get(`/videos/${id}`),

  search: (params: {
    q: string;
    page?: number;
    limit?: number;
    type?: string;
    duration?: string;
    uploadDate?: string;
    sortBy?: string;
    category?: string;
  }) => {
    // Strip undefined/empty values so they don't serialize as "undefined"
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = String(value);
      }
    }
    const query = new URLSearchParams(cleaned).toString();
    return apiClient.get(`/videos/search?${query}`);
  },

  getRecommended: (videoId: string, limit?: number) =>
    apiClient.get(`/videos/${videoId}/recommended?limit=${limit || 10}`),

  toggleLike: (videoId: string, type: 'LIKE' | 'DISLIKE') =>
    apiClient.post(`/videos/${videoId}/like`, { type }),

  getLikeStatus: (videoId: string) =>
    apiClient.get(`/videos/${videoId}/like-status`),
};

// Users
export const usersApi = {
  getProfile: (id?: string) =>
    apiClient.get(id ? `/users/profile/${id}` : '/users/profile'),

  updateProfile: (data: Record<string, unknown>) => apiClient.patch('/users/profile', data),

  getWatchHistory: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/users/watch-history?${query}`);
  },

  clearWatchHistory: () => apiClient.delete('/users/watch-history'),

  getLikedVideos: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/users/liked-videos?${query}`);
  },

  getSubscriptions: () => apiClient.get('/users/subscriptions'),

  subscribe: (channelId: string) =>
    apiClient.post(`/users/subscriptions/${channelId}`, {}),

  unsubscribe: (channelId: string) =>
    apiClient.delete(`/users/subscriptions/${channelId}`),

  checkSubscription: (channelId: string) =>
    apiClient.get(`/users/subscriptions/${channelId}/status`),
};

// Channels
export const channelsApi = {
  getChannel: (identifier: string) => apiClient.get(`/channels/${identifier}`),

  getChannelVideos: (
    id: string,
    params?: { page?: number; limit?: number; type?: string }
  ) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/channels/${id}/videos?${query}`);
  },

  updateChannel: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/channels/${id}`, data),
};

// Analytics
export const analyticsApi = {
  trackView: (data: {
    videoId: string;
    watchDuration: number;
    completed: boolean;
    lastPosition: number;
  }) => apiClient.post('/analytics/view', data),

  trackShare: (data: { videoId: string; platform?: string }) =>
    apiClient.post('/analytics/share', data),

  getTrending: (limit?: number) =>
    apiClient.get(`/analytics/trending?limit=${limit || 20}`),
};

// Recommendations
export const recommendationsApi = {
  getPersonalized: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/recommendations/personalized?${query}`);
  },

  getSubscriptionFeed: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/recommendations/subscriptions?${query}`);
  },

  getShortsFeed: (params?: { page?: number; limit?: number; category?: string }) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/recommendations/shorts?${query}`);
  },

  // Two-stage engine endpoints
  getForYou: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return apiClient.get(`/recommendations/for-you?${query}`);
  },

  getContinueWatching: (limit?: number) =>
    apiClient.get(`/recommendations/continue-watching?limit=${limit || 10}`),

  getTrending: (limit?: number) =>
    apiClient.get(`/recommendations/trending?limit=${limit || 30}`),

  getSubscriptionVideos: (limit?: number) =>
    apiClient.get(`/recommendations/subscription-videos?limit=${limit || 20}`),

  getHomeFeed: () => apiClient.get('/recommendations/home'),
};
