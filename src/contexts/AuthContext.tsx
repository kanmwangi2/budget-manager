import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  BackendOrganizationSelection,
  BackendUser,
  authApi,
  clearAccessToken,
  getAccessToken,
  organizationsApi
} from '../services/api'
import { User, OrganizationSelection } from '../types/user'

interface AuthContextType {
  currentUser: User | null
  selectedOrganization: OrganizationSelection | null
  availableOrganizations: OrganizationSelection[]
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (updates: Partial<User>) => Promise<void>
  selectOrganization: (organization: OrganizationSelection) => void
  refreshOrganizations: () => Promise<void>
  clearSelectedOrganization: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationSelection | null>(null)
  const [availableOrganizations, setAvailableOrganizations] = useState<OrganizationSelection[]>([])
  const [loading, setLoading] = useState(true)

  const mapUser = (apiUser: BackendUser): User => {
    const notifications = apiUser.preferences?.notifications || {}
    return {
      id: apiUser.id,
      email: apiUser.email,
      name: apiUser.name,
      role: apiUser.role,
      avatar: apiUser.avatar,
      createdAt: new Date(apiUser.created_at),
      lastLogin: apiUser.last_login ? new Date(apiUser.last_login) : undefined,
      isActive: apiUser.is_active,
      organizationIds: apiUser.organization_ids || [],
      departmentIds: apiUser.department_ids || [],
      preferences: {
        theme: apiUser.preferences?.theme || 'system',
        currency: apiUser.preferences?.currency || 'RWF',
        language: apiUser.preferences?.language || 'en',
        notifications: {
          email: notifications.email ?? true,
          push: notifications.push ?? true,
          budgetAlerts: notifications.budgetAlerts ?? notifications.budget_alerts ?? true,
          approvalRequests: notifications.approvalRequests ?? notifications.approval_requests ?? true
        }
      }
    }
  }

  const mapOrganizations = (orgs: BackendOrganizationSelection[]): OrganizationSelection[] => {
    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      role: org.role,
      departments: org.departments
    }))
  }

  const restoreSelectedOrganization = (organizations: OrganizationSelection[]) => {
    if (organizations.length === 0) {
      setSelectedOrganization(null)
      localStorage.removeItem('selectedOrganization')
      return
    }

    if (organizations.length === 1) {
      setSelectedOrganization(organizations[0])
      localStorage.setItem('selectedOrganization', JSON.stringify(organizations[0]))
      return
    }

    const saved = localStorage.getItem('selectedOrganization')
    if (!saved) {
      setSelectedOrganization(null)
      return
    }

    try {
      const savedOrg = JSON.parse(saved)
      const stillAvailable = organizations.find((organization) => organization.id === savedOrg.id)
      if (stillAvailable) {
        setSelectedOrganization(stillAvailable)
      } else {
        setSelectedOrganization(null)
        localStorage.removeItem('selectedOrganization')
      }
    } catch {
      setSelectedOrganization(null)
      localStorage.removeItem('selectedOrganization')
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      const token = getAccessToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await authApi.me()
        const mappedUser = mapUser(response.user)
        const organizations = mapOrganizations(response.available_organizations)

        setCurrentUser(mappedUser)
        setAvailableOrganizations(organizations)
        restoreSelectedOrganization(organizations)
      } catch {
        clearAccessToken()
        setCurrentUser(null)
        setSelectedOrganization(null)
        setAvailableOrganizations([])
        localStorage.removeItem('selectedOrganization')
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    const mappedUser = mapUser(response.user)
    const organizations = mapOrganizations(response.available_organizations)

    setCurrentUser(mappedUser)
    setAvailableOrganizations(organizations)
    setSelectedOrganization(null)
    localStorage.removeItem('selectedOrganization')
  }

  const register = async (email: string, password: string, name: string) => {
    await authApi.register(email, password, name)
  }

  const logout = async () => {
    clearAccessToken()
    setCurrentUser(null)
    setAvailableOrganizations([])
    setSelectedOrganization(null)
    localStorage.removeItem('selectedOrganization')
  }

  const resetPassword = async (email: string) => {
    await authApi.resetPassword(email)
  }

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!currentUser) return

    const response = await authApi.updateMe({
      name: updates.name,
      avatar: updates.avatar,
      preferences: updates.preferences
    })

    setCurrentUser(mapUser(response.user))
    const organizations = mapOrganizations(response.available_organizations)
    setAvailableOrganizations(organizations)
    restoreSelectedOrganization(organizations)
  }

  const selectOrganization = (organization: OrganizationSelection) => {
    const isAvailable = availableOrganizations.some((item) => item.id === organization.id)
    if (!isAvailable) {
      return
    }

    setSelectedOrganization(organization)
    // Store selection in localStorage for persistence
    localStorage.setItem('selectedOrganization', JSON.stringify(organization))
  }

  const clearSelectedOrganization = () => {
    setSelectedOrganization(null)
    localStorage.removeItem('selectedOrganization')
  }

  const refreshOrganizations = async () => {
    if (!currentUser) {
      return
    }

    const organizations = mapOrganizations(await organizationsApi.available())
    setAvailableOrganizations(organizations)
    restoreSelectedOrganization(organizations)
  }

  const value: AuthContextType & { clearSelectedOrganization: () => void } = {
    currentUser,
    selectedOrganization,
    availableOrganizations,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile,
    selectOrganization,
    refreshOrganizations,
    clearSelectedOrganization
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
