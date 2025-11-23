"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function MemoryOfTheDay({ conversationId }) {
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchRandomMemory = async () => {
    setLoading(true)
    try {
      const data = await api.getRandomMemory(conversationId)
      setMemory(data)
    } catch (error) {
      console.error('Error fetching random memory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRandomMemory()
  }, [conversationId])

  if (loading) {
    return null
  }

  if (!memory) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Memory of the Day</h2>
        <button
          onClick={fetchRandomMemory}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="bg-black/30 rounded-lg p-6 border border-yellow-500/20">
        <p className="text-white text-lg mb-4">{memory.content}</p>
        <p className="text-xs text-gray-400">
          {new Date(memory.createdAt).toLocaleDateString()} at {new Date(memory.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

