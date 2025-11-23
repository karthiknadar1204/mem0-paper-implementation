"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export default function MemoryList({ conversationId, initialMemories, onMemoryAdded, loading: initialLoading }) {
  const [memories, setMemories] = useState(initialMemories || [])
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(50)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setMemories(initialMemories || [])
  }, [initialMemories])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const newMemories = await api.getMemories(conversationId, 50, offset)
      if (newMemories.length === 0) {
        setHasMore(false)
      } else {
        setMemories([...memories, ...newMemories])
        setOffset(offset + 50)
      }
    } catch (error) {
      console.error('Error loading more memories:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  if (initialLoading && memories.length === 0) {
    return <div className="text-gray-400">Loading memories...</div>
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No memories yet. Start chatting to create memories!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">All Memories</h2>
      <div className="space-y-4">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors"
          >
            <p className="text-white mb-2">{memory.content}</p>
            <p className="text-xs text-gray-500">
              {new Date(memory.createdAt).toLocaleDateString()} at {new Date(memory.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  )
}

