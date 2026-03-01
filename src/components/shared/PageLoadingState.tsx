import React from 'react'
import LoadingSpinner from './LoadingSpinner'

const PageLoadingState: React.FC = () => {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading page...</p>
      </div>
    </div>
  )
}

export default PageLoadingState
