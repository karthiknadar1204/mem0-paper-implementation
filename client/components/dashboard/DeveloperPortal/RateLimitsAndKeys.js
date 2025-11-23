"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function RateLimitsAndKeys() {
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const data = await api.getApiKeys()
        setApiKeys(data)
      } catch (error) {
        console.error('Error fetching API keys:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApiKeys()
  }, [])

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">API Keys</h2>
      {apiKeys.length === 0 ? (
        <p className="text-gray-400">No API keys found</p>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-[#050505] border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{key.name}</h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  key.isActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                }`}>
                  {key.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-400 font-mono mb-1">
                {key.keyPrefix}...
              </p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                {key.lastUsedAt && (
                  <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

