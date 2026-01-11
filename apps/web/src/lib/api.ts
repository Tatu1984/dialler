const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'API_ERROR',
            message: 'An error occurred',
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
        },
      };
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiClient();

// Pagination response type
interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  [key: string]: T[] | any;
}

// Auth API
export const authApi = {
  login: (email: string, password: string, tenantSlug?: string) =>
    api.post<{
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        tenant: { id: string; name: string; slug: string };
      };
      token: string;
    }>('/api/v1/auth/login', { email, password, tenantSlug }),

  logout: () => api.post('/api/v1/auth/logout'),

  me: () =>
    api.get<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      tenant: { id: string; name: string; slug: string };
    }>('/api/v1/auth/me'),

  refresh: () => api.post<{ token: string }>('/api/v1/auth/refresh'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/v1/auth/change-password', { currentPassword, newPassword }),
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/users${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<{ user: any }>(`/api/v1/users/${id}`),
  create: (data: { email: string; password: string; firstName: string; lastName: string; role: string }) =>
    api.post<{ user: any }>('/api/v1/users', data),
  update: (id: string, data: any) => api.put<{ user: any }>(`/api/v1/users/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/users/${id}`),
};

// Teams API
export const teamsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/teams${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<any>(`/api/v1/teams/${id}`),
  create: (data: { name: string; managerId?: string; memberIds?: string[] }) =>
    api.post<{ team: any }>('/api/v1/teams', data),
  update: (id: string, data: any) => api.put<{ team: any }>(`/api/v1/teams/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/teams/${id}`),
  addMembers: (id: string, userIds: string[]) =>
    api.post<{ added: number }>(`/api/v1/teams/${id}/members`, { userIds }),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/api/v1/teams/${teamId}/members/${userId}`),
};

// Skills API
export const skillsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/skills${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<{ skill: any }>(`/api/v1/skills/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<{ skill: any }>('/api/v1/skills', data),
  update: (id: string, data: any) => api.put<{ skill: any }>(`/api/v1/skills/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/skills/${id}`),
};

// Campaigns API
export const campaignsApi = {
  list: (params?: { page?: number; limit?: number; type?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/campaigns${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<{ campaign: any }>(`/api/v1/campaigns/${id}`),
  create: (data: { name: string; type: string; dialMode?: string; settings?: any; schedule?: any }) =>
    api.post<{ campaign: any }>('/api/v1/campaigns', data),
  update: (id: string, data: any) => api.put<{ campaign: any }>(`/api/v1/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/campaigns/${id}`),
  start: (id: string) => api.post<{ campaign: any }>(`/api/v1/campaigns/${id}/start`),
  pause: (id: string) => api.post<{ campaign: any }>(`/api/v1/campaigns/${id}/pause`),
  stop: (id: string) => api.post<{ campaign: any }>(`/api/v1/campaigns/${id}/stop`),
};

// Lead Lists API
export const leadListsApi = {
  list: (params?: { page?: number; limit?: number; campaignId?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/lead-lists${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<any>(`/api/v1/lead-lists/${id}`),
  create: (data: { name: string; description?: string; campaignId?: string }) =>
    api.post<{ leadList: any }>('/api/v1/lead-lists', data),
  update: (id: string, data: any) => api.put<{ leadList: any }>(`/api/v1/lead-lists/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/lead-lists/${id}`),
};

// Leads API
export const leadsApi = {
  list: (params?: { page?: number; limit?: number; listId?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/leads${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<{ lead: any }>(`/api/v1/leads/${id}`),
  create: (data: { listId: string; phoneNumber: string; firstName?: string; lastName?: string; email?: string }) =>
    api.post<{ lead: any }>('/api/v1/leads', data),
  update: (id: string, data: any) => api.put<{ lead: any }>(`/api/v1/leads/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/leads/${id}`),
  import: (listId: string, leads: any[]) =>
    api.post<{ imported: number; leads: any[] }>('/api/v1/leads/import', { listId, leads }),
};

// Queues API
export const queuesApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/queues${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<{ queue: any }>(`/api/v1/queues/${id}`),
  getStats: (id: string) => api.get<any>(`/api/v1/queues/${id}/stats`),
  create: (data: { name: string; strategy?: string; ringTimeout?: number; maxWaitTime?: number }) =>
    api.post<{ queue: any }>('/api/v1/queues', data),
  update: (id: string, data: any) => api.put<{ queue: any }>(`/api/v1/queues/${id}`, data),
};

// Agents API
export const agentsApi = {
  list: (params?: { page?: number; limit?: number; state?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/agents${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<any>(`/api/v1/agents/${id}`),
  getState: (id: string) => api.get<any>(`/api/v1/agents/${id}/state`),
  updateState: (id: string, state: string, reason?: string) =>
    api.post<any>(`/api/v1/agents/${id}/state`, { state, reason }),
  dashboard: () => api.get<any>('/api/v1/agents/dashboard'),
};

// Dispositions API
export const dispositionsApi = {
  list: (params?: { page?: number; limit?: number; campaignId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/dispositions${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<{ disposition: any }>(`/api/v1/dispositions/${id}`),
  create: (data: { code: string; name: string; campaignId?: string; isPositive?: boolean }) =>
    api.post<{ disposition: any }>('/api/v1/dispositions', data),
  update: (id: string, data: any) => api.put<{ disposition: any }>(`/api/v1/dispositions/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/dispositions/${id}`),
  reorder: (orders: Array<{ id: string; sortOrder: number }>) =>
    api.post('/api/v1/dispositions/reorder', { orders }),
};

// DNC API
export const dncApi = {
  list: (params?: { page?: number; limit?: number; search?: string; source?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/dnc${query ? `?${query}` : ''}`);
  },
  check: (phoneNumber: string) => api.get<{ onDnc: boolean; entry?: any }>(`/api/v1/dnc/check/${phoneNumber}`),
  add: (data: { phoneNumber: string; source?: string; reason?: string; expiresAt?: string }) =>
    api.post<{ entry: any }>('/api/v1/dnc', data),
  bulkAdd: (data: { phoneNumbers: string[]; source?: string; reason?: string }) =>
    api.post<{ added: number; skipped: number }>('/api/v1/dnc/bulk', data),
  remove: (id: string) => api.delete(`/api/v1/dnc/${id}`),
  removeByNumber: (phoneNumber: string) => api.delete(`/api/v1/dnc/by-number/${phoneNumber}`),
  cleanup: () => api.post<{ removed: number }>('/api/v1/dnc/cleanup'),
};

// Scripts API
export const scriptsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<PaginatedResponse<any>>(`/api/v1/scripts${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api.get<{ script: any }>(`/api/v1/scripts/${id}`),
  create: (data: { name: string; description?: string; content?: any }) =>
    api.post<{ script: any }>('/api/v1/scripts', data),
  update: (id: string, data: any) => api.put<{ script: any }>(`/api/v1/scripts/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/scripts/${id}`),
};

// Tenants API
export const tenantsApi = {
  getCurrent: () => api.get<any>('/api/v1/tenants'),
  update: (data: any) => api.put<any>('/api/v1/tenants', data),
  getStats: () => api.get<any>('/api/v1/tenants/stats'),
};
