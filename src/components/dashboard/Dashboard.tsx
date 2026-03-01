import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, DollarSign, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { donorsApi, departmentsApi, usersApi } from '../../services/api'

interface DashboardMetrics {
  departmentCount: number
  donorCount: number
  activeDonorCount: number
  totalDonations: number
  organizationUserCount: number
}

interface DonorSnapshot {
  id: string
  name: string
  totalDonated: number
  currency: string
  status: 'active' | 'inactive' | 'prospect'
}

const Dashboard: React.FC = () => {
  const { currentUser, selectedOrganization } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    departmentCount: 0,
    donorCount: 0,
    activeDonorCount: 0,
    totalDonations: 0,
    organizationUserCount: 0
  })
  const [topDonors, setTopDonors] = useState<DonorSnapshot[]>([])

  const canManageUsers = currentUser?.role === 'app_admin' || currentUser?.role === 'org_admin'

  const formatCurrency = useMemo(() => {
    const currency = selectedOrganization?.id ? currentUser?.preferences.currency || 'RWF' : 'RWF'
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    })
  }, [currentUser?.preferences.currency, selectedOrganization?.id])

  const fetchData = useCallback(async () => {
    if (!selectedOrganization) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [departmentResponse, donorResponse, userResponse] = await Promise.all([
        departmentsApi.list({ organizationIds: [selectedOrganization.id] }),
        donorsApi.list({ organizationId: selectedOrganization.id }),
        canManageUsers ? usersApi.list({ organizationId: selectedOrganization.id }) : Promise.resolve([])
      ])

      const totalDonations = donorResponse.reduce((sum, donor) => sum + donor.total_donated, 0)
      const activeDonors = donorResponse.filter((donor) => donor.status === 'active')
      const donors = donorResponse
        .map((donor) => ({
          id: donor.id,
          name: donor.name,
          totalDonated: donor.total_donated,
          currency: donor.currency,
          status: donor.status
        }))
        .sort((a, b) => b.totalDonated - a.totalDonated)
        .slice(0, 5)

      setMetrics({
        departmentCount: departmentResponse.length,
        donorCount: donorResponse.length,
        activeDonorCount: activeDonors.length,
        totalDonations,
        organizationUserCount: userResponse.length
      })
      setTopDonors(donors)
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [canManageUsers, selectedOrganization])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
        <p className="font-semibold">Dashboard data could not be loaded</p>
        <p className="mt-1 text-sm">{error}</p>
        <button onClick={fetchData} className="mt-4 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Departments</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{metrics.departmentCount}</p>
            </div>
            <Building2 className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Donors</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{metrics.donorCount}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Donors</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeDonorCount}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Donations</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency.format(metrics.totalDonations)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Donors</h3>
            <Link to="/donors" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              View all
            </Link>
          </div>

          {topDonors.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No donor data for this organization yet.</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {topDonors.map((donor) => (
                <div key={donor.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{donor.name}</p>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{donor.status}</p>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: donor.currency,
                      maximumFractionDigits: 0
                    }).format(donor.totalDonated)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Organization Snapshot</h3>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrganization?.name}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Your Access</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedOrganization?.role === 'admin' ? 'Administrator' : 'Member'}
              </dd>
            </div>
            {canManageUsers && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Users</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">{metrics.organizationUserCount}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
