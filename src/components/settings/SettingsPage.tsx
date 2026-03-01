import React, { useEffect, useState } from 'react'
import { Bell, KeyRound, Palette, Save, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useTheme } from '../../contexts/ThemeContext'

const SettingsPage: React.FC = () => {
  const { currentUser, updateUserProfile, resetPassword } = useAuth()
  const { showToast } = useNotifications()
  const { theme, setTheme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [requestingReset, setRequestingReset] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    currency: 'RWF',
    language: 'en',
    emailNotifications: true,
    pushNotifications: true,
    budgetAlerts: true,
    approvalRequests: true
  })

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setFormData({
      name: currentUser.name,
      currency: currentUser.preferences.currency,
      language: currentUser.preferences.language,
      emailNotifications: currentUser.preferences.notifications.email,
      pushNotifications: currentUser.preferences.notifications.push,
      budgetAlerts: currentUser.preferences.notifications.budgetAlerts,
      approvalRequests: currentUser.preferences.notifications.approvalRequests
    })
  }, [currentUser])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!currentUser) {
      return
    }

    setSaving(true)
    try {
      await updateUserProfile({
        name: formData.name.trim(),
        preferences: {
          theme,
          currency: formData.currency,
          language: formData.language,
          notifications: {
            email: formData.emailNotifications,
            push: formData.pushNotifications,
            budgetAlerts: formData.budgetAlerts,
            approvalRequests: formData.approvalRequests
          }
        }
      })
      showToast('success', 'Settings saved')
    } catch (error: any) {
      showToast('error', error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!currentUser) {
      return
    }

    setRequestingReset(true)
    try {
      await resetPassword(currentUser.email)
      showToast('success', 'Password reset instructions have been sent if the account exists')
    } catch (error: any) {
      showToast('error', error.message || 'Failed to request password reset')
    } finally {
      setRequestingReset(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your profile, preferences, and notification behavior.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="card p-6">
          <h2 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <User className="mr-2 h-5 w-5 text-primary-600" />
            Profile
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input type="email" value={currentUser?.email || ''} className="input opacity-70" disabled />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <Palette className="mr-2 h-5 w-5 text-primary-600" />
            Preferences
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
              <select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)} className="input">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
              <select
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                className="input"
              >
                <option value="RWF">RWF</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
              <select
                value={formData.language}
                onChange={(event) => setFormData((prev) => ({ ...prev, language: event.target.value }))}
                className="input"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="rw">Kinyarwanda</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <Bell className="mr-2 h-5 w-5 text-primary-600" />
            Notifications
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={formData.emailNotifications}
                onChange={(event) => setFormData((prev) => ({ ...prev, emailNotifications: event.target.checked }))}
              />
              Email notifications
            </label>
            <label className="flex items-center gap-3 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={formData.pushNotifications}
                onChange={(event) => setFormData((prev) => ({ ...prev, pushNotifications: event.target.checked }))}
              />
              Push notifications
            </label>
            <label className="flex items-center gap-3 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={formData.budgetAlerts}
                onChange={(event) => setFormData((prev) => ({ ...prev, budgetAlerts: event.target.checked }))}
              />
              Budget alerts
            </label>
            <label className="flex items-center gap-3 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={formData.approvalRequests}
                onChange={(event) => setFormData((prev) => ({ ...prev, approvalRequests: event.target.checked }))}
              />
              Approval requests
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handlePasswordReset}
            className="btn btn-outline"
            disabled={requestingReset}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {requestingReset ? 'Requesting reset...' : 'Request password reset'}
          </button>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
