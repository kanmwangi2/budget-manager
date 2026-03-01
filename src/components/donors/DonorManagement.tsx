import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit2, Mail, Phone, Plus, Search, Trash2, Wallet } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { donorsApi } from '../../services/api'

type DonorType = 'individual' | 'foundation' | 'corporation' | 'government'
type DonorStatus = 'active' | 'inactive' | 'prospect'

interface DonorRecord {
  id: string
  name: string
  donorType: DonorType
  email?: string
  phone?: string
  currency: string
  totalDonated: number
  status: DonorStatus
  notes?: string
  updatedAt: string
}

const DonorManagement: React.FC = () => {
  const { currentUser, selectedOrganization } = useAuth()
  const { showToast } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DonorStatus>('all')
  const [donors, setDonors] = useState<DonorRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDonorId, setEditingDonorId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    donorType: 'individual' as DonorType,
    email: '',
    phone: '',
    currency: 'RWF',
    totalDonated: '0',
    status: 'active' as DonorStatus,
    notes: ''
  })

  const canManageDonors = useMemo(() => {
    if (!currentUser || !selectedOrganization) {
      return false
    }
    return currentUser.role === 'app_admin' || selectedOrganization.role === 'admin'
  }, [currentUser, selectedOrganization])

  const fetchDonors = useCallback(async () => {
    if (!selectedOrganization) {
      return
    }

    setLoading(true)
    try {
      const response = await donorsApi.list({
        organizationId: selectedOrganization.id,
        status: statusFilter === 'all' ? undefined : statusFilter
      })

      setDonors(
        response.map((donor) => ({
          id: donor.id,
          name: donor.name,
          donorType: donor.donor_type,
          email: donor.email,
          phone: donor.phone,
          currency: donor.currency,
          totalDonated: donor.total_donated,
          status: donor.status,
          notes: donor.notes,
          updatedAt: donor.updated_at
        }))
      )
    } catch (error: any) {
      showToast('error', error.message || 'Failed to load donors')
    } finally {
      setLoading(false)
    }
  }, [selectedOrganization, showToast, statusFilter])

  useEffect(() => {
    fetchDonors()
  }, [fetchDonors])

  const resetForm = () => {
    setFormData({
      name: '',
      donorType: 'individual',
      email: '',
      phone: '',
      currency: 'RWF',
      totalDonated: '0',
      status: 'active',
      notes: ''
    })
  }

  const openCreateModal = () => {
    setEditingDonorId(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (donor: DonorRecord) => {
    setEditingDonorId(donor.id)
    setFormData({
      name: donor.name,
      donorType: donor.donorType,
      email: donor.email || '',
      phone: donor.phone || '',
      currency: donor.currency,
      totalDonated: String(donor.totalDonated),
      status: donor.status,
      notes: donor.notes || ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDonorId(null)
    resetForm()
  }

  const handleSaveDonor = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedOrganization || !canManageDonors) {
      return
    }
    if (!formData.name.trim()) {
      showToast('error', 'Donor name is required')
      return
    }

    const totalDonated = Number(formData.totalDonated)
    if (Number.isNaN(totalDonated) || totalDonated < 0) {
      showToast('error', 'Total donated must be a valid positive number')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        donor_type: formData.donorType,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        currency: formData.currency.trim() || 'RWF',
        total_donated: totalDonated,
        status: formData.status,
        notes: formData.notes.trim() || undefined
      }

      if (editingDonorId) {
        await donorsApi.update(editingDonorId, payload)
        showToast('success', 'Donor updated')
      } else {
        await donorsApi.create({
          organization_id: selectedOrganization.id,
          ...payload
        })
        showToast('success', 'Donor created')
      }

      closeModal()
      await fetchDonors()
    } catch (error: any) {
      showToast('error', error.message || 'Failed to save donor')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDonor = async (donorId: string) => {
    if (!canManageDonors) {
      return
    }
    if (!confirm('Delete this donor? This action cannot be undone.')) {
      return
    }

    try {
      await donorsApi.delete(donorId)
      showToast('success', 'Donor deleted')
      await fetchDonors()
    } catch (error: any) {
      showToast('error', error.message || 'Failed to delete donor')
    }
  }

  const filteredDonors = donors.filter((donor) => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return true
    }
    return (
      donor.name.toLowerCase().includes(query) ||
      donor.donorType.toLowerCase().includes(query) ||
      (donor.email || '').toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Donors</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track donor relationships and funding for {selectedOrganization?.name || 'your organization'}.
          </p>
        </div>

        {canManageDonors && (
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Donor
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input pl-10"
              placeholder="Search donors..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | DonorStatus)}
            className="input"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-10">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">No donors found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try a different search term.' : 'Add a donor to start tracking funding.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredDonors.map((donor) => (
            <div key={donor.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{donor.name}</h3>
                  <p className="text-sm capitalize text-gray-500 dark:text-gray-400">{donor.donorType}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${donor.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                      : donor.status === 'prospect'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                  >
                    {donor.status}
                  </span>
                  {canManageDonors && (
                    <>
                      <button
                        onClick={() => openEditModal(donor)}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDonor(donor.id)}
                        className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{donor.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{donor.phone || 'No phone provided'}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 text-sm dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Total donated</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: donor.currency,
                    maximumFractionDigits: 0
                  }).format(donor.totalDonated)}
                </span>
              </div>

              {donor.notes && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{donor.notes}</p>}
              <p className="mt-2 text-xs text-gray-400">Updated {new Date(donor.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingDonorId ? 'Edit Donor' : 'Add Donor'}
            </h2>
            <form onSubmit={handleSaveDonor} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <select
                    value={formData.donorType}
                    onChange={(event) => setFormData((prev) => ({ ...prev, donorType: event.target.value as DonorType }))}
                    className="input"
                  >
                    <option value="individual">Individual</option>
                    <option value="foundation">Foundation</option>
                    <option value="corporation">Corporation</option>
                    <option value="government">Government</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Total Donated</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalDonated}
                    onChange={(event) => setFormData((prev) => ({ ...prev, totalDonated: event.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as DonorStatus }))}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingDonorId ? 'Update Donor' : 'Create Donor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DonorManagement
