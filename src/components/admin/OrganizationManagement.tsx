import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Search,
  Filter,
  MoreVertical
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { Organization, User } from '../../types/user'
import { organizationsApi } from '../../services/api'

interface OrganizationWithStats extends Organization {
  memberCount: number
  adminCount: number
  departmentCount: number
}

const OrganizationManagement: React.FC = () => {
  const { currentUser } = useAuth()
  const { showToast } = useNotifications()
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrganizationWithStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    country: '',
    currency: 'RWF'
  })

  const canManageOrganizations = (user: User | null) => {
    return user?.role === 'app_admin'
  }

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      const response = await organizationsApi.list({ withStats: true })
      const mapped = response.map((organization) => ({
        id: organization.id,
        name: organization.name,
        description: organization.description,
        country: organization.country,
        currency: organization.currency,
        adminIds: organization.admin_ids || [],
        memberIds: organization.member_ids || [],
        settings: organization.settings,
        subscription: organization.subscription,
        createdAt: new Date(organization.created_at),
        updatedAt: new Date(organization.updated_at),
        createdBy: organization.created_by || '',
        memberCount: organization.member_count || 0,
        adminCount: organization.admin_count || 0,
        departmentCount: organization.department_count || 0
      }))

      setOrganizations(mapped)
    } catch (error) {
      showToast('error', 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  // Check permissions
  if (!currentUser || !canManageOrganizations(currentUser)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You don't have permission to manage organizations.
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      showToast('error', 'Organization name is required')
      return
    }

    try {
      if (editingOrg) {
        // Update existing organization
        await organizationsApi.update(editingOrg.id, {
          name: formData.name,
          description: formData.description,
          country: formData.country,
          currency: formData.currency
        })
        showToast('success', 'Organization updated successfully')
      } else {
        // Create new organization
        await organizationsApi.create({
          name: formData.name,
          description: formData.description,
          country: formData.country,
          currency: formData.currency
        })
        showToast('success', 'Organization created successfully')
      }
      
      setIsCreateModalOpen(false)
      setEditingOrg(null)
      setFormData({
        name: '',
        description: '',
        country: '',
        currency: 'RWF'
      })
      fetchOrganizations()
    } catch (error) {
      showToast('error', 'Failed to save organization')
    }
  }

  const handleEdit = (org: OrganizationWithStats) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      description: org.description || '',
      country: org.country || '',
      currency: org.currency || 'RWF'
    })
    setIsCreateModalOpen(true)
  }

  const handleDelete = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return
    }

    try {
      await organizationsApi.delete(orgId)
      showToast('success', 'Organization deleted successfully')
      fetchOrganizations()
    } catch (error) {
      showToast('error', 'Failed to delete organization')
    }
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingOrg(null)
    setFormData({
      name: '',
      description: '',
      country: '',
      currency: 'RWF'
    })
    setIsCreateModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Organization Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage organizations and their settings
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>

        {/* Organizations Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.map((org) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-100 dark:bg-primary-900 p-2 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {org.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {org.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setSelectedOrg(selectedOrg === org.id ? null : org.id)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                      {selectedOrg === org.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => {
                              handleEdit(org)
                              setSelectedOrg(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(org.id)
                              setSelectedOrg(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {org.memberCount}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Members
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {org.adminCount}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Admins
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {org.departmentCount}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Departments
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingOrg ? 'Edit Organization' : 'Create Organization'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="RWF">Rwandan Franc (RWF)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                  >
                    {editingOrg ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}

export default OrganizationManagement
