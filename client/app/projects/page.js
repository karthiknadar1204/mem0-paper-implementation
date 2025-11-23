"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "../../lib/api"
import CreateProjectModal from "../../components/CreateProjectModal"
import CreateApiKeyModal from "../../components/CreateApiKeyModal"
import ShowApiKeyModal from "../../components/ShowApiKeyModal"

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState("projects")
  const [showModal, setShowModal] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showNewApiKey, setShowNewApiKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState("")
  const [conversations, setConversations] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiKeysLoading, setApiKeysLoading] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getConversations()
      setConversations(data)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const fetchApiKeys = useCallback(async () => {
    try {
      setApiKeysLoading(true)
      const data = await api.getApiKeys()
      setApiKeys(data)
    } catch (error) {
      console.error('Error fetching API keys:', error)
    } finally {
      setApiKeysLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "api-keys") {
      fetchApiKeys()
    }
  }, [activeTab, fetchApiKeys])

  const handleCreate = async (name) => {
    await api.createConversation(name)
    await fetchConversations()
  }

  const handleCreateApiKey = async (name) => {
    const result = await api.createApiKey(name)
    setNewApiKey(result.key)
    setShowNewApiKey(true)
    await fetchApiKeys()
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-mono">
      {/* Sidebar */}
      <div className="w-64 bg-[#0a0a0a] border-r border-white/10 p-6">
        <h2 className="text-xl font-bold mb-6">Settings</h2>
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab("projects")}
            className={`w-full text-left px-4 py-2 rounded-sm transition-colors ${
              activeTab === "projects"
                ? "bg-white text-black font-bold"
                : "text-gray-400 hover:text-white hover:bg-[#111]"
            }`}
          >
            Create Project
          </button>
          <button
            onClick={() => setActiveTab("api-keys")}
            className={`w-full text-left px-4 py-2 rounded-sm transition-colors ${
              activeTab === "api-keys"
                ? "bg-white text-black font-bold"
                : "text-gray-400 hover:text-white hover:bg-[#111]"
            }`}
          >
            API Keys
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {activeTab === "projects" && (
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
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold">
                        {conversation.name || `Project ${conversation.id.slice(0, 8)}`}
                      </h3>
                      <a
                        href={`/projects/dashboard/${conversation.id}`}
                        className="px-4 py-2 bg-white hover:bg-gray-200 text-black font-bold rounded-sm transition-colors text-sm"
                      >
                        View Dashboard
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-gray-400">
                        ID: <code className="text-white font-mono text-xs">{conversation.id}</code>
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(conversation.id)
                        }}
                        className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                        title="Copy ID"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      Created: {new Date(conversation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "api-keys" && (
          <div className="container mx-auto px-6 py-20">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">API Keys</h1>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="px-6 py-2 bg-white hover:bg-gray-200 text-black font-bold rounded-sm transition-colors"
              >
                Create
              </button>
            </div>

            {apiKeysLoading ? (
              <div className="text-gray-400">Loading...</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-gray-400">No API keys yet. Create your first API key!</div>
            ) : (
              <div className="grid gap-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold">{key.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        key.isActive 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                      }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      <code className="text-white">{key.keyPrefix}...</code>
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
      />

      <CreateApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSubmit={handleCreateApiKey}
      />

      <ShowApiKeyModal
        isOpen={showNewApiKey}
        onClose={() => setShowNewApiKey(false)}
        apiKey={newApiKey}
      />
    </div>
  )
}

