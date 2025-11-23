"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function OnThisDay({ conversationId }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOnThisDay = async () => {
      try {
        const data = await api.getOnThisDay(conversationId)
        setMemories(data)
      } catch (error) {
        console.error('Error fetching on this day memories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOnThisDay()
  }, [conversationId])

  if (loading) {
    return null
  }

  if (memories.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-8">
      <h2 className="text-2xl font-bold mb-4">On This Day</h2>
      <p className="text-gray-300 mb-6">Memories from this date in previous years</p>
      <div className="space-y-4">
        {memories.map((memory) => (
          <div key={memory.id} className="bg-black/30 rounded-lg p-4 border border-purple-500/20">
            <p className="text-white mb-2">{memory.content}</p>
            <p className="text-xs text-gray-400">
              {new Date(memory.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

