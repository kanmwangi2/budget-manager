import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Settings,
  Shield,
  Users,
  Wallet,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const AppShell: React.FC = () => {
  const { currentUser, selectedOrganization, clearSelectedOrganization, logout } = useAuth()
  const { theme, isDark, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const navigation = useMemo(
    () => [
      { name: 'Dashboard', href: '/', icon: BarChart3 },
      { name: 'Departments', href: '/departments', icon: Building2 },
      { name: 'Donors', href: '/donors', icon: Wallet },
      { name: 'Reports', href: '/reports', icon: FileText }
    ],
    []
  )

  const pageTitle = useMemo(() => {
    const basePath = location.pathname.split('/').slice(0, 2).join('/')
    const routeTitles: Record<string, string> = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/departments': 'Departments',
      '/donors': 'Donors',
      '/reports': 'Reports',
      '/settings': 'Settings',
      '/admin': 'Administration',
      '/admin/organizations': 'Organization Administration',
      '/admin/users': 'User Administration'
    }

    return routeTitles[location.pathname] || routeTitles[basePath] || 'Budget Manager'
  }, [location.pathname])

  const canAccessAdmin = currentUser?.role === 'app_admin' || currentUser?.role === 'org_admin'
  const adminHref = currentUser?.role === 'app_admin' ? '/admin/organizations' : '/admin/users'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleSwitchOrganization = () => {
    clearSelectedOrganization()
    navigate('/select-organization')
  }

  const renderThemeIcon = () => {
    if (isDark) {
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )
    }

    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-gray-800">
          <div className="absolute right-0 top-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-white focus:outline-none"
              aria-label="Close navigation menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center px-4 pt-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <h1 className="ml-3 text-lg font-bold text-gray-900 dark:text-white">Budget Manager</h1>
          </div>
          <nav className="mt-6 flex-1 space-y-1 px-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `${isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    } group flex items-center rounded-md px-3 py-2 text-sm font-medium`
                  }
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center px-4 pt-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <h1 className="ml-3 text-lg font-bold text-gray-900 dark:text-white">Budget Manager</h1>
          </div>

          {selectedOrganization && (
            <div className="mt-4 px-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrganization.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedOrganization.role === 'admin' ? 'Administrator access' : 'Member access'}
                </p>
              </div>
            </div>
          )}

          <nav className="mt-6 flex-1 space-y-1 px-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `${isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    } group flex items-center rounded-md px-3 py-2 text-sm font-medium`
                  }
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="flex h-full flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <div className="mx-auto flex h-16 max-w-full items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                aria-label="Open navigation menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h2>
                {selectedOrganization && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Organization: {selectedOrganization.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                aria-label="Toggle theme"
              >
                {renderThemeIcon()}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((previous) => !previous)}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <span className="hidden sm:inline">{currentUser?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>

                    {canAccessAdmin && (
                      <Link
                        to={adminHref}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Page
                      </Link>
                    )}

                    <button
                      onClick={handleSwitchOrganization}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Users className="h-4 w-4" />
                      Switch Organization
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell
