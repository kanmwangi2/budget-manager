import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Edit2, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { departmentsApi } from '../../services/api'

interface DepartmentRecord {
  id: string
  name: string
  description?: string
  managerId?: string
  memberCount: number
  updatedAt: string
}

const DepartmentList: React.FC = () => {
  const { currentUser, selectedOrganization } = useAuth()
  const { showToast } = useNotifications()
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const canManageDepartments = useMemo(() => {
    if (!currentUser || !selectedOrganization) {
      return false
    }
    return currentUser.role === 'app_admin' || selectedOrganization.role === 'admin'
  }, [currentUser, selectedOrganization])

  const fetchDepartments = useCallback(async () => {
    if (!selectedOrganization) {
      return
    }

    setLoading(true)
    try {
      const response = await departmentsApi.list({ organizationIds: [selectedOrganization.id] })
      setDepartments(
        response.map((department) => ({
          id: department.id,
          name: department.name,
          description: department.description,
          managerId: department.manager_id,
          memberCount: department.member_ids.length,
          updatedAt: department.updated_at
        }))
      )
    } catch (error: any) {
      showToast('error', error.message || 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }, [selectedOrganization, showToast])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const openCreateModal = () => {
    setEditingDepartmentId(null)
    setFormData({ name: '', description: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (department: DepartmentRecord) => {
    setEditingDepartmentId(department.id)
    setFormData({
      name: department.name,
      description: department.description || ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDepartmentId(null)
    setFormData({ name: '', description: '' })
  }

  const handleSaveDepartment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedOrganization || !canManageDepartments) {
      return
    }

    if (!formData.name.trim()) {
      showToast('error', 'Department name is required')
      return
    }

    setSaving(true)
    try {
      if (editingDepartmentId) {
        await departmentsApi.update(editingDepartmentId, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        })
        showToast('success', 'Department updated')
      } else {
        await departmentsApi.create({
          organization_id: selectedOrganization.id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        })
        showToast('success', 'Department created')
      }

      closeModal()
      await fetchDepartments()
    } catch (error: any) {
      showToast('error', error.message || 'Failed to save department')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!canManageDepartments) {
      return
    }
    if (!confirm('Delete this department? This action cannot be undone.')) {
      return
    }

    try {
      await departmentsApi.delete(departmentId)
      showToast('success', 'Department deleted')
      await fetchDepartments()
    } catch (error: any) {
      showToast('error', error.message || 'Failed to delete department')
    }
  }

  const filteredDepartments = departments.filter((department) => {
    const query = searchTerm.toLowerCase().trim()
    if (!query) {
      return true
    }
    return (
      department.name.toLowerCase().includes(query) ||
      (department.description || '').toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage departments for {selectedOrganization?.name || 'your organization'}.
          </p>
        </div>
        {canManageDepartments && (
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            New Department
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="input pl-10"
            placeholder="Search departments..."
          />
        </div>
      </div>

      {!canManageDepartments && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700/40 dark:bg-yellow-900/10 dark:text-yellow-200">
          You have read-only access for departments in this organization.
        </div>
      )}

      {loading ? (
        <div className="card p-10">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">No departments found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try a different search term.' : 'Create a department to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDepartments.map((department) => (
            <div key={department.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{department.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {department.description || 'No description provided.'}
                  </p>
                </div>

                {canManageDepartments && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(department)}
                      className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(department.id)}
                      className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{department.memberCount} members</span>
                <span>Updated {new Date(department.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingDepartmentId ? 'Edit Department' : 'Create Department'}
            </h2>
            <form onSubmit={handleSaveDepartment} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingDepartmentId ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DepartmentList
