import { UserRole } from '../types/user'

const ACCESS_TOKEN_KEY = 'authToken'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '')
const DEFAULT_TIMEOUT_MS = 15000

export interface ApiErrorData {
  detail?: string
  message?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface BackendDepartmentBrief {
  id: string
  name: string
}

export interface BackendOrganizationSelection {
  id: string
  name: string
  role: 'admin' | 'member'
  departments: BackendDepartmentBrief[]
}

export interface BackendUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  created_at: string
  last_login?: string
  is_active: boolean
  organization_ids: string[]
  department_ids: string[]
  preferences: any
}

export interface BackendUserListItem extends BackendUser {
  organization_names: string[]
  department_names: string[]
}

export interface BackendOrganization {
  id: string
  name: string
  description?: string
  country: string
  currency: string
  admin_ids: string[]
  member_ids: string[]
  settings: any
  subscription: any
  created_at: string
  updated_at: string
  created_by?: string
  member_count?: number
  admin_count?: number
  department_count?: number
}

export interface BackendDepartment {
  id: string
  name: string
  description?: string
  organization_id: string
  manager_id?: string
  member_ids: string[]
  created_at: string
  updated_at: string
}

export interface BackendDonor {
  id: string
  organization_id: string
  name: string
  donor_type: 'individual' | 'foundation' | 'corporation' | 'government'
  email?: string
  phone?: string
  currency: string
  total_donated: number
  status: 'active' | 'inactive' | 'prospect'
  notes?: string
  created_at: string
  updated_at: string
}

interface AuthTokenResponse {
  access_token: string
  token_type: string
  user: BackendUser
  available_organizations: BackendOrganizationSelection[]
}

interface AuthMeResponse {
  user: BackendUser
  available_organizations: BackendOrganizationSelection[]
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean
  timeoutMs?: number
}

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY)

export const setAccessToken = (token: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

const buildQuery = (params: Record<string, string | number | boolean | undefined | string[]>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, item))
      return
    }
    search.append(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, timeoutMs = DEFAULT_TIMEOUT_MS, headers, body, ...rest } = options
  const token = getAccessToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers || {})
  }

  if (auth && token) {
    const headersRecord = finalHeaders as Record<string, string>
    headersRecord.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal
    })

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`
      try {
        const errorData = (await response.json()) as ApiErrorData
        message = errorData.detail || errorData.message || message
      } catch {
        // Keep fallback message when response body is not JSON.
      }
      throw new ApiError(message, response.status)
    }

    if (response.status === 204) {
      return null as T
    }

    return (await response.json()) as T
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new ApiError('Request timed out', 408)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export const authApi = {
  async register(email: string, password: string, name: string) {
    return request<{ message: string }>('/auth/register', {
      method: 'POST',
      auth: false,
      body: { email, password, name }
    })
  },

  async login(email: string, password: string) {
    const response = await request<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password }
    })
    setAccessToken(response.access_token)
    return response
  },

  async me() {
    return request<AuthMeResponse>('/auth/me')
  },

  async resetPassword(email: string) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: { email }
    })
  },

  async updateMe(payload: {
    name?: string
    avatar?: string
    preferences?: any
  }) {
    return request<AuthMeResponse>('/auth/me', {
      method: 'PATCH',
      body: payload
    })
  }
}

export const organizationsApi = {
  async available() {
    return request<BackendOrganizationSelection[]>('/organizations/available')
  },

  async list(params?: { withStats?: boolean; adminOnly?: boolean }) {
    const query = buildQuery({
      with_stats: params?.withStats,
      admin_only: params?.adminOnly
    })
    return request<BackendOrganization[]>(`/organizations${query}`)
  },

  async create(payload: {
    name: string
    description?: string
    country?: string
    currency?: string
  }) {
    return request<BackendOrganization>('/organizations', {
      method: 'POST',
      body: payload
    })
  },

  async update(
    organizationId: string,
    payload: {
      name?: string
      description?: string
      country?: string
      currency?: string
    }
  ) {
    return request<BackendOrganization>(`/organizations/${organizationId}`, {
      method: 'PATCH',
      body: payload
    })
  },

  async delete(organizationId: string) {
    return request<{ message: string }>(`/organizations/${organizationId}`, {
      method: 'DELETE'
    })
  }
}

export const departmentsApi = {
  async list(params?: { organizationIds?: string[] }) {
    const query = buildQuery({ organization_ids: params?.organizationIds || [] })
    return request<BackendDepartment[]>(`/departments${query}`)
  },

  async create(payload: {
    name: string
    description?: string
    organization_id: string
    manager_id?: string
  }) {
    return request<BackendDepartment>('/departments', {
      method: 'POST',
      body: payload
    })
  },

  async update(
    departmentId: string,
    payload: {
      name?: string
      description?: string
      manager_id?: string
    }
  ) {
    return request<BackendDepartment>(`/departments/${departmentId}`, {
      method: 'PATCH',
      body: payload
    })
  },

  async delete(departmentId: string) {
    return request<{ message: string }>(`/departments/${departmentId}`, {
      method: 'DELETE'
    })
  }
}

export const donorsApi = {
  async list(params?: { organizationId?: string; status?: 'active' | 'inactive' | 'prospect' }) {
    const query = buildQuery({
      organization_id: params?.organizationId,
      status: params?.status
    })
    return request<BackendDonor[]>(`/donors${query}`)
  },

  async create(payload: {
    organization_id: string
    name: string
    donor_type: 'individual' | 'foundation' | 'corporation' | 'government'
    email?: string
    phone?: string
    currency?: string
    total_donated?: number
    status?: 'active' | 'inactive' | 'prospect'
    notes?: string
  }) {
    return request<BackendDonor>('/donors', {
      method: 'POST',
      body: payload
    })
  },

  async update(
    donorId: string,
    payload: {
      name?: string
      donor_type?: 'individual' | 'foundation' | 'corporation' | 'government'
      email?: string
      phone?: string
      currency?: string
      total_donated?: number
      status?: 'active' | 'inactive' | 'prospect'
      notes?: string
    }
  ) {
    return request<BackendDonor>(`/donors/${donorId}`, {
      method: 'PATCH',
      body: payload
    })
  },

  async delete(donorId: string) {
    return request<{ message: string }>(`/donors/${donorId}`, {
      method: 'DELETE'
    })
  }
}

export const usersApi = {
  async list(params?: { role?: UserRole; organizationId?: string }) {
    const query = buildQuery({
      role: params?.role,
      organization_id: params?.organizationId
    })
    return request<BackendUserListItem[]>(`/users${query}`)
  },

  async create(payload: {
    name: string
    email: string
    password: string
    role: UserRole
    organization_ids: string[]
    department_ids: string[]
  }) {
    return request<BackendUser>('/users', {
      method: 'POST',
      body: payload
    })
  },

  async update(
    userId: string,
    payload: {
      name?: string
      email?: string
      role?: UserRole
      organization_ids?: string[]
      department_ids?: string[]
      is_active?: boolean
    }
  ) {
    return request<BackendUser>(`/users/${userId}`, {
      method: 'PATCH',
      body: payload
    })
  },

  async updateStatus(userId: string, isActive: boolean) {
    return request<BackendUser>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: { is_active: isActive }
    })
  },

  async delete(userId: string) {
    return request<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE'
    })
  }
}
