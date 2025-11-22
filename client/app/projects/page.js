"use client"

import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import CreateProjectModal from "../../components/CreateProjectModal"

export default function ProjectsPage() {
  const [showModal, setShowModal] = useState(false)
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const data = await api.getConversations()
      setConversations(data)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  const handleCreate = async (name) => {
    await api.createConversation(name)
    await fetchConversations()
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto px-6 py-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Projects</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-white hover:bg-gray-200 text-black font-bold rounded-sm transition-colors"
          >
            Create
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-gray-400">No projects yet. Create your first project!</div>
        ) : (
          <div className="grid gap-4">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors"
              >
                <h3 className="text-xl font-bold mb-2">
                  {conversation.name || `Project ${conversation.id.slice(0, 8)}`}
                </h3>
                <p className="text-sm text-gray-400">
                  Created: {new Date(conversation.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}

