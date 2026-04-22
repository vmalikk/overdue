'use client'

import { useState, useEffect } from 'react'
import { storage } from '@/lib/appwrite/client'
import { Models } from 'appwrite'

export function StorageUsage() {
  const [usedBytes, setUsedBytes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  // Free tier limit: 2GB
  const TOTAL_LIMIT_BYTES = 2 * 1024 * 1024 * 1024

  useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        // Note: Client SDK cannot list buckets to sum up usage across all buckets.
        // We would need a specific Bucket ID to list files and sum their size.
        // For now, we'll initialize with 0 or a stored value if available.
        // If you have a specific bucket, you can uncomment and configure below:
        
        /*
        const BUCKET_ID = 'YOUR_BUCKET_ID';
        const files = await storage.listFiles(BUCKET_ID);
        const total = files.files.reduce((acc, file) => acc + file.sizeOriginal, 0);
        setUsedBytes(total);
        */
        
        // Simulating some usage for display if needed, or keeping real 0
        setUsedBytes(0)
      } catch (error) {
        console.error('Failed to fetch storage usage:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStorageUsage()
  }, [])

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const percentage = Math.min((usedBytes / TOTAL_LIMIT_BYTES) * 100, 100)
  const isHighUsage = percentage > 80

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-text-primary">Storage</h3>
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="h-3 w-full bg-background-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isHighUsage ? 'bg-status-red' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {formatBytes(usedBytes)} <span className="text-text-muted font-normal">used</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">
              {formatBytes(TOTAL_LIMIT_BYTES - usedBytes)} left
            </p>
          </div>
        </div>
        
        <p className="text-xs text-text-muted pt-1 border-t border-border mt-2">
          {percentage.toFixed(1)}% of 2GB Limit
        </p>
      </div>
    </div>
  )
}
