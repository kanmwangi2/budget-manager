import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, TrendingUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { donorsApi, departmentsApi } from '../../services/api'

interface DepartmentMetric {
  id: string
  name: string
  memberCount: number
}

interface DonorMetric {
  id: string
  name: string
  donorType: string
  totalDonated: number
  currency: string
  status: 'active' | 'inactive' | 'prospect'
}

const ReportsPage: React.FC = () => {
  const { currentUser, selectedOrganization } = useAuth()
  const { showToast } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<DepartmentMetric[]>([])
  const [donors, setDonors] = useState<DonorMetric[]>([])

  const fetchData = useCallback(async () => {
    if (!selectedOrganization) {
      return
    }

    setLoading(true)
    try {
      const [departmentResponse, donorResponse] = await Promise.all([
        departmentsApi.list({ organizationIds: [selectedOrganization.id] }),
        donorsApi.list({ organizationId: selectedOrganization.id })
      ])

      setDepartments(
        departmentResponse.map((department) => ({
          id: department.id,
          name: department.name,
          memberCount: department.member_ids.length
        }))
      )
      setDonors(
        donorResponse.map((donor) => ({
          id: donor.id,
          name: donor.name,
          donorType: donor.donor_type,
          totalDonated: donor.total_donated,
          currency: donor.currency,
          status: donor.status
        }))
      )
    } catch (error: any) {
      showToast('error', error.message || 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [selectedOrganization, showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const metrics = useMemo(() => {
    const activeDonors = donors.filter((donor) => donor.status === 'active')
    const totalDonations = donors.reduce((sum, donor) => sum + donor.totalDonated, 0)
    const topDepartment = [...departments].sort((a, b) => b.memberCount - a.memberCount)[0]

    return {
      activeDonors: activeDonors.length,
      totalDonations,
      departments: departments.length,
      topDepartment: topDepartment?.name || 'N/A'
    }
  }, [departments, donors])

  const exportCsv = () => {
    const rows = [
      ['Report', 'Organization', selectedOrganization?.name || ''],
      ['Generated At', new Date().toISOString(), ''],
      [],
      ['Donors'],
      ['Name', 'Type', 'Status', 'Currency', 'Total Donated'],
      ...donors.map((donor) => [
        donor.name,
        donor.donorType,
        donor.status,
        donor.currency,
        donor.totalDonated.toString()
      ]),
      [],
      ['Departments'],
      ['Name', 'Members'],
      ...departments.map((department) => [department.name, department.memberCount.toString()])
    ]

    const csvContent = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.setAttribute('download', `organization-report-${selectedOrganization?.id || 'export'}.csv`)
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Organization performance and funding insights for {selectedOrganization?.name || 'the active organization'}.
          </p>
        </div>
        <button onClick={exportCsv} className="btn btn-primary" disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="card p-10">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Donors</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeDonors}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Donations</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: currentUser?.preferences.currency || 'RWF',
                  maximumFractionDigits: 0
                }).format(metrics.totalDonations)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">Departments</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{metrics.departments}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">Largest Team</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{metrics.topDepartment}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h2 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                  <TrendingUp className="mr-2 h-5 w-5 text-primary-600" />
                  Donor Contributions
                </h2>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Donor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Type
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {donors.map((donor) => (
                      <tr key={donor.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{donor.name}</td>
                        <td className="px-4 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">{donor.donorType}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: donor.currency,
                            maximumFractionDigits: 0
                          }).format(donor.totalDonated)}
                        </td>
                      </tr>
                    ))}
                    {donors.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No donor data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h2 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                  <FileSpreadsheet className="mr-2 h-5 w-5 text-primary-600" />
                  Department Coverage
                </h2>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Department
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Members
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {departments.map((department) => (
                      <tr key={department.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{department.name}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                          {department.memberCount}
                        </td>
                      </tr>
                    ))}
                    {departments.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No department data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ReportsPage
