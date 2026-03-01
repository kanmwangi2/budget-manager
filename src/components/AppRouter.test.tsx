import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { vi } from 'vitest'
import AppRouter from './AppRouter'
import { useAuth } from '../contexts/AuthContext'
import { User } from '../types/user'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('./layout/AppShell', () => {
  const MockAppShell = () => (
    <div>
      <div>App Shell</div>
      <Outlet />
    </div>
  )

  return {
    __esModule: true,
    default: MockAppShell
  }
})

vi.mock('./shared/LoadingSpinner', () => ({
  __esModule: true,
  default: () => <div>Loading Spinner</div>
}))

vi.mock('./shared/PageLoadingState', () => ({
  __esModule: true,
  default: () => <div>Page Loading</div>
}))

vi.mock('./dashboard/Dashboard', () => ({
  __esModule: true,
  default: () => <div>Dashboard Page</div>
}))

vi.mock('./auth/LoginPage', () => ({
  __esModule: true,
  default: () => <div>Login Page</div>
}))

vi.mock('./auth/RegisterPage', () => ({
  __esModule: true,
  default: () => <div>Register Page</div>
}))

vi.mock('./auth/OrganizationSelector', () => ({
  __esModule: true,
  default: () => <div>Organization Selector Page</div>
}))

vi.mock('./admin/OrganizationManagement', () => ({
  __esModule: true,
  default: () => <div>Organization Admin Page</div>
}))

vi.mock('./admin/UserManagement', () => ({
  __esModule: true,
  default: () => <div>User Admin Page</div>
}))

vi.mock('./departments/DepartmentList', () => ({
  __esModule: true,
  default: () => <div>Departments Page</div>
}))

vi.mock('./donors/DonorManagement', () => ({
  __esModule: true,
  default: () => <div>Donors Page</div>
}))

vi.mock('./reports/ReportsPage', () => ({
  __esModule: true,
  default: () => <div>Reports Page</div>
}))

vi.mock('./settings/SettingsPage', () => ({
  __esModule: true,
  default: () => <div>Settings Page</div>
}))

const mockUseAuth = vi.mocked(useAuth)

const buildUser = (role: User['role']): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role,
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  isActive: true,
  organizationIds: ['org-1'],
  departmentIds: ['dept-1'],
  preferences: {
    theme: 'system',
    currency: 'RWF',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      budgetAlerts: true,
      approvalRequests: true
    }
  }
})

const setAuthMock = ({
  currentUser,
  selectedOrganization,
  loading = false
}: {
  currentUser: User | null
  selectedOrganization: { id: string; name: string; role: 'admin' | 'member'; departments: { id: string; name: string }[] } | null
  loading?: boolean
}) => {
  mockUseAuth.mockReturnValue({
    currentUser,
    selectedOrganization,
    availableOrganizations: selectedOrganization
      ? [selectedOrganization]
      : [{ id: 'org-1', name: 'Org One', role: 'admin', departments: [] }],
    loading,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    updateUserProfile: vi.fn(),
    selectOrganization: vi.fn(),
    refreshOrganizations: vi.fn(),
    clearSelectedOrganization: vi.fn()
  })
}

const renderWithRouter = (path: string) => {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AppRouter />
    </MemoryRouter>
  )
}

describe('AppRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated users to login', async () => {
    setAuthMock({
      currentUser: null,
      selectedOrganization: null
    })

    renderWithRouter('/')

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })

  it('forces organization selection when logged in without selected organization', async () => {
    setAuthMock({
      currentUser: buildUser('user'),
      selectedOrganization: null
    })

    renderWithRouter('/departments')

    expect(await screen.findByText('Organization Selector Page')).toBeInTheDocument()
  })

  it('renders app shell and page content for authenticated users with selected organization', async () => {
    setAuthMock({
      currentUser: buildUser('user'),
      selectedOrganization: { id: 'org-1', name: 'Org One', role: 'member', departments: [] }
    })

    renderWithRouter('/reports')

    expect(await screen.findByText('App Shell')).toBeInTheDocument()
    expect(await screen.findByText('Reports Page')).toBeInTheDocument()
  })

  it('allows app admins to access organization admin route', async () => {
    setAuthMock({
      currentUser: buildUser('app_admin'),
      selectedOrganization: { id: 'org-1', name: 'Org One', role: 'admin', departments: [] }
    })

    renderWithRouter('/admin/organizations')

    expect(await screen.findByText('Organization Admin Page')).toBeInTheDocument()
  })

  it('blocks org admins from organization admin route', async () => {
    setAuthMock({
      currentUser: buildUser('org_admin'),
      selectedOrganization: { id: 'org-1', name: 'Org One', role: 'admin', departments: [] }
    })

    renderWithRouter('/admin/organizations')

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument()
    expect(screen.queryByText('Organization Admin Page')).not.toBeInTheDocument()
  })

  it('blocks regular users from user admin route', async () => {
    setAuthMock({
      currentUser: buildUser('user'),
      selectedOrganization: { id: 'org-1', name: 'Org One', role: 'member', departments: [] }
    })

    renderWithRouter('/admin/users')

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument()
    expect(screen.queryByText('User Admin Page')).not.toBeInTheDocument()
  })
})
