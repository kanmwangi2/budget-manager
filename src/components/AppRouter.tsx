import React, { Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types/user'
import AppShell from './layout/AppShell'
import LoadingSpinner from './shared/LoadingSpinner'
import PageLoadingState from './shared/PageLoadingState'

const Dashboard = React.lazy(() => import('./dashboard/Dashboard'))
const LoginPage = React.lazy(() => import('./auth/LoginPage'))
const RegisterPage = React.lazy(() => import('./auth/RegisterPage'))
const OrganizationSelector = React.lazy(() => import('./auth/OrganizationSelector'))
const OrganizationManagement = React.lazy(() => import('./admin/OrganizationManagement'))
const UserManagement = React.lazy(() => import('./admin/UserManagement'))
const DepartmentList = React.lazy(() => import('./departments/DepartmentList'))
const DonorManagement = React.lazy(() => import('./donors/DonorManagement'))
const ReportsPage = React.lazy(() => import('./reports/ReportsPage'))
const SettingsPage = React.lazy(() => import('./settings/SettingsPage'))

const FullPageLoading: React.FC = () => (
  <div className="min-h-screen">
    <LoadingSpinner className="min-h-screen" />
  </div>
)

const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<PageLoadingState />}>{children}</Suspense>
)

const RequireOrganization: React.FC = () => {
  const { selectedOrganization } = useAuth()
  const location = useLocation()

  if (!selectedOrganization) {
    return <Navigate to="/select-organization" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

const RequireRole: React.FC<{ roles: UserRole[] }> = ({ roles }) => {
  const { currentUser } = useAuth()

  if (!currentUser || !roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

const AppRouter: React.FC = () => {
  const { currentUser, loading, selectedOrganization } = useAuth()

  if (loading) {
    return <FullPageLoading />
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<FullPageLoading />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<FullPageLoading />}>
              <RegisterPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route
        path="/select-organization"
        element={
          <Suspense fallback={<FullPageLoading />}>
            <OrganizationSelector />
          </Suspense>
        }
      />

      <Route element={<RequireOrganization />}>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <LazyPage>
                <Dashboard />
              </LazyPage>
            }
          />
          <Route
            path="/dashboard"
            element={
              <LazyPage>
                <Dashboard />
              </LazyPage>
            }
          />
          <Route
            path="/departments"
            element={
              <LazyPage>
                <DepartmentList />
              </LazyPage>
            }
          />
          <Route
            path="/donors"
            element={
              <LazyPage>
                <DonorManagement />
              </LazyPage>
            }
          />
          <Route
            path="/reports"
            element={
              <LazyPage>
                <ReportsPage />
              </LazyPage>
            }
          />
          <Route
            path="/settings"
            element={
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            }
          />

          <Route element={<RequireRole roles={['app_admin']} />}>
            <Route
              path="/admin/organizations"
              element={
                <LazyPage>
                  <OrganizationManagement />
                </LazyPage>
              }
            />
          </Route>

          <Route element={<RequireRole roles={['app_admin', 'org_admin']} />}>
            <Route
              path="/admin/users"
              element={
                <LazyPage>
                  <UserManagement />
                </LazyPage>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={selectedOrganization ? '/' : '/select-organization'} replace />}
      />
    </Routes>
  )
}

export default AppRouter
