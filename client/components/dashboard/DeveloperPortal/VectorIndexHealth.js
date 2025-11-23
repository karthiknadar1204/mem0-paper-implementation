"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function VectorIndexHealth({ conversationId }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.getVectorHealth(conversationId)
        setHealth(data)
      } catch (error) {
        console.error('Error fetching vector health:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
  }, [conversationId])

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!health) {
    return null
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-400">Vector Index Health</h2>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500">Conversation Vectors</p>
          <p className="text-xl font-bold">{health.conversationVectors}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Index Vectors</p>
          <p className="text-xl font-bold">{health.totalVectors}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Dimension</p>
          <p className="text-xl font-bold">{health.dimension}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Index Usage</p>
          <p className="text-xl font-bold">{parseFloat(health.indexUsage).toFixed(2)}%</p>
        </div>
      </div>
    </div>
  )
}

