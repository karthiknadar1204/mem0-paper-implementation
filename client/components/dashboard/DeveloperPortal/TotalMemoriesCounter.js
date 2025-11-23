"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function TotalMemoriesCounter({ conversationId }) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const memories = await api.getMemories(conversationId, 1, 0)
        // Get total count by fetching all (or use a count endpoint if available)
        const allMemories = await api.getMemories(conversationId, 1000, 0)
        setCount(allMemories.length)
      } catch (error) {
        console.error('Error fetching memory count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCount()
  }, [conversationId])

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2 text-gray-400">Total Memories</h2>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <p className="text-4xl font-bold">{count}</p>
      )}
    </div>
  )
}

