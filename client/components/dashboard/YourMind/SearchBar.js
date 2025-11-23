"use client"

import { useState } from "react"
import { api } from "@/lib/api"

export default function SearchBar({ conversationId }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const data = await api.searchMemories(conversationId, query)
      setResults(data)
    } catch (error) {
      console.error('Error searching memories:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Search Memories</h2>
      <form onSubmit={handleSearch} className="space-y-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your memories..."
          className="w-full px-4 py-3 bg-[#050505] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-2 bg-white hover:bg-gray-200 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
      {searched && (
        <div className="mt-6 space-y-3">
          {results.length === 0 ? (
            <p className="text-gray-400">No memories found</p>
          ) : (
            <>
              <p className="text-sm text-gray-400">{results.length} result(s) found</p>
              {results.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-[#050505] border border-white/10 rounded-lg p-4"
                >
                  <p className="text-white">{memory.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(memory.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

