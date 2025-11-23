"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function APIUsageChart({ conversationId }) {
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await api.getApiUsage(conversationId)
        setUsage(data)
      } catch (error) {
        console.error('Error fetching API usage:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsage()
  }, [conversationId])

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
        <div className="text-gray-400">Loading API usage...</div>
      </div>
    )
  }

  if (!usage || usage.daily.length === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">API Usage</h2>
        <p className="text-gray-400">No API usage data available</p>
      </div>
    )
  }

  const maxValue = Math.max(
    ...usage.daily.map(d => Math.max(d.chat, d.ask, d.messages)),
    1
  )

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">API Usage Over Time</h2>
      
      {/* Totals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#050505] border border-white/10 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Total /chat</p>
          <p className="text-2xl font-bold">{usage.total.chat}</p>
        </div>
        <div className="bg-[#050505] border border-white/10 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Total /ask</p>
          <p className="text-2xl font-bold">{usage.total.ask}</p>
        </div>
        <div className="bg-[#050505] border border-white/10 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Total /messages</p>
          <p className="text-2xl font-bold">{usage.total.messages}</p>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="space-y-2">
        {usage.daily.slice(-14).map((day, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <div className="w-24 text-xs text-gray-400">
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="flex-1 flex gap-2">
              <div className="flex-1 bg-[#050505] rounded h-6 flex items-center">
                <div
                  className="bg-blue-500 h-full rounded flex items-center justify-end pr-2"
                  style={{ width: `${(day.chat / maxValue) * 100}%` }}
                >
                  {day.chat > 0 && <span className="text-xs text-white">{day.chat}</span>}
                </div>
              </div>
              <div className="flex-1 bg-[#050505] rounded h-6 flex items-center">
                <div
                  className="bg-green-500 h-full rounded flex items-center justify-end pr-2"
                  style={{ width: `${(day.ask / maxValue) * 100}%` }}
                >
                  {day.ask > 0 && <span className="text-xs text-white">{day.ask}</span>}
                </div>
              </div>
              <div className="flex-1 bg-[#050505] rounded h-6 flex items-center">
                <div
                  className="bg-purple-500 h-full rounded flex items-center justify-end pr-2"
                  style={{ width: `${(day.messages / maxValue) * 100}%` }}
                >
                  {day.messages > 0 && <span className="text-xs text-white">{day.messages}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>/chat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>/ask</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span>/messages</span>
        </div>
      </div>
    </div>
  )
}

