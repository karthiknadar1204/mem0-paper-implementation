"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function RawMemoryFeed({ conversationId }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchRawMemories = async () => {
      try {
        const data = await api.getRawMemories(conversationId)
        setMemories(data)
      } catch (error) {
        console.error('Error fetching raw memories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRawMemories()
  }, [conversationId])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(memories, null, 2))
    alert('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Raw Memory Feed</h2>
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
        >
          Copy JSON
        </button>
      </div>
      <div className="bg-[#050505] border border-white/10 rounded-lg p-4 overflow-auto max-h-96">
        <pre className="text-xs text-gray-300 font-mono">
          {expanded || memories.length <= 5
            ? JSON.stringify(memories, null, 2)
            : JSON.stringify(memories.slice(0, 5), null, 2) + '\n...'}
        </pre>
      </div>
      {memories.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-sm text-gray-400 hover:text-white"
        >
          {expanded ? 'Show Less' : `Show All (${memories.length} memories)`}
        </button>
      )}
    </div>
  )
}

