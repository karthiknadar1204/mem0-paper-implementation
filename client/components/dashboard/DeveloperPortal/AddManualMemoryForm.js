"use client"

import { api } from "@/lib/api"
import { useState } from "react"

export default function AddManualMemoryForm({ conversationId }) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    setSuccess(false)
    try {
      await api.addManualMemory(conversationId, content)
      setContent("")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error adding manual memory:', error)
      alert('Failed to add memory')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Add Manual Memory</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter memory content..."
          className="w-full h-32 bg-[#050505] border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 resize-none"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 py-2 bg-white hover:bg-gray-200 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Memory"}
        </button>
        {success && (
          <p className="text-green-400 text-sm">Memory added successfully!</p>
        )}
      </form>
    </div>
  )
}

