"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function RequestLogsTable({ conversationId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.getRequestLogs(conversationId)
        setLogs(data)
      } catch (error) {
        console.error('Error fetching request logs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [conversationId])

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Request Logs (Last 100)</h2>
      {logs.length === 0 ? (
        <p className="text-gray-400">No request logs available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400">Timestamp</th>
                <th className="text-left py-3 px-4 text-gray-400">Endpoint</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-gray-400">Duration (ms)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-gray-300">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-gray-300 font-mono text-xs">{log.endpoint}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.statusCode >= 200 && log.statusCode < 300
                        ? 'bg-green-500/20 text-green-400'
                        : log.statusCode >= 400
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {log.statusCode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{log.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

