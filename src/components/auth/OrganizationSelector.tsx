import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { OrganizationSelection } from '../../types/user'
import { useNavigate } from 'react-router-dom'
import { organizationsApi } from '../../services/api'

const OrganizationSelector: React.FC = () => {
  const { availableOrganizations, selectOrganization, currentUser, refreshOrganizations } = useAuth()
  const { showToast } = useNotifications()
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgCountry, setNewOrgCountry] = useState('')
  const [newOrgCurrency, setNewOrgCurrency] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (availableOrganizations.length === 1) {
      setSelectedOrgId(availableOrganizations[0].id)
      return
    }
    if (availableOrganizations.length > 1 && !selectedOrgId) {
      setSelectedOrgId(availableOrganizations[0].id)
    }
  }, [availableOrganizations, selectedOrgId])

  const handleOrganizationSelect = (organization: OrganizationSelection) => {
    selectOrganization(organization)
    showToast('success', `Selected ${organization.name}`)
    navigate('/')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedOrg = availableOrganizations.find(org => org.id === selectedOrgId)
    if (selectedOrg) {
      handleOrganizationSelect(selectedOrg)
    }
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName || !newOrgCountry || !newOrgCurrency) {
      showToast('error', 'Please fill in all fields')
      return
    }
    setCreateLoading(true)
    try {
      const organization = await organizationsApi.create({
        name: newOrgName,
        country: newOrgCountry,
        currency: newOrgCurrency,
      })
      showToast('success', 'Organization created!')
      setCreating(false)
      setNewOrgName('')
      setNewOrgCountry('')
      setNewOrgCurrency('')
      await refreshOrganizations()
      setSelectedOrgId(organization.id)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create organization')
    } finally {
      setCreateLoading(false)
    }
  }

  if (availableOrganizations.length === 0 && currentUser?.role !== 'app_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              No Organizations Available
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You are not assigned to any organizations yet. Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Select Organization
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Choose which assigned organization you want to work with for this session
          </p>
        </div>

        {/* Create Organization (app_admin only) */}
        {currentUser?.role === 'app_admin' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            {!creating ? (
              <button
                className="text-primary-600 hover:underline font-medium"
                onClick={() => setCreating(true)}
              >
                + Create New Organization
              </button>
            ) : (
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div>
                  <label className="block text-left text-gray-700 dark:text-gray-200 mb-1">Organization Name</label>
                  <input
                    type="text"
                    className="w-full rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    disabled={createLoading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-left text-gray-700 dark:text-gray-200 mb-1">Country</label>
                  <input
                    type="text"
                    className="w-full rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    value={newOrgCountry}
                    onChange={e => setNewOrgCountry(e.target.value)}
                    disabled={createLoading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-left text-gray-700 dark:text-gray-200 mb-1">Currency</label>
                  <input
                    type="text"
                    className="w-full rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    value={newOrgCurrency}
                    onChange={e => setNewOrgCurrency(e.target.value)}
                    disabled={createLoading}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:opacity-50"
                    disabled={createLoading}
                  >
                    {createLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setCreating(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {availableOrganizations.length === 0 && currentUser?.role === 'app_admin' ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Create your first organization to continue.
              </div>
            ) : (
              availableOrganizations.map((org) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 ${
                  selectedOrgId === org.id
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSelectedOrgId(org.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-full p-2 ${
                      selectedOrgId === org.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {org.name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          org.role === 'admin'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {org.role === 'admin' ? 'Administrator' : 'Member'}
                        </span>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Users className="h-4 w-4 mr-1" />
                          {org.departments.length} departments
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${
                    selectedOrgId === org.id ? 'rotate-90' : ''
                  } text-gray-400`} />
                </div>

                {selectedOrgId === org.id && org.departments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 pl-12 space-y-2"
                  >
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Available Departments:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {org.departments.map((dept) => (
                        <span
                          key={dept.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        >
                          {dept.name}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                <input
                  type="radio"
                  name="organization"
                  value={org.id}
                  checked={selectedOrgId === org.id}
                  onChange={() => setSelectedOrgId(org.id)}
                  className="sr-only"
                />
              </motion.div>
              ))
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={!selectedOrgId || availableOrganizations.length === 0}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OrganizationSelector
