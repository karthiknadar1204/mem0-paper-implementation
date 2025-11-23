"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function TimelineView({ conversationId }) {
  const [timeline, setTimeline] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data = await api.getTimeline(conversationId)
        setTimeline(data)
      } catch (error) {
        console.error('Error fetching timeline:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTimeline()
  }, [conversationId])

  if (loading) {
    return null
  }

  const dates = Object.keys(timeline).sort((a, b) => new Date(b) - new Date(a))

  if (dates.length === 0) {
    return null
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">Timeline</h2>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {dates.map((date) => (
            <div key={date} className="flex-shrink-0 w-64">
              <div className="bg-[#050505] border border-white/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="space-y-2">
                  {timeline[date].map((memory) => (
                    <div key={memory.id} className="text-sm text-white">
                      {memory.content.length > 100 
                        ? `${memory.content.substring(0, 100)}...` 
                        : memory.content}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

