"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import DashboardTabs from "../../../../components/dashboard/DashboardTabs"
import YourMindTab from "../../../../components/dashboard/YourMindTab"
import DeveloperPortalTab from "../../../../components/dashboard/DeveloperPortalTab"

export default function DashboardPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const conversationId = params.id
  const [mode, setMode] = useState(searchParams.get('mode') || 'human')
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const conversations = await api.getConversations()
        const found = conversations.find(c => c.id === conversationId)
        setConversation(found || null)
      } catch (error) {
        console.error('Error fetching conversation:', error)
      } finally {
        setLoading(false)
      }
    }

    if (conversationId) {
      fetchConversation()
    }
  }, [conversationId])

  const handleModeChange = (newMode) => {
    setMode(newMode)
    router.push(`/projects/dashboard/${conversationId}?mode=${newMode}`)
    localStorage.setItem('dashboardMode', newMode)
  }

  useEffect(() => {
    const savedMode = localStorage.getItem('dashboardMode')
    if (savedMode && !searchParams.get('mode')) {
      setMode(savedMode)
      router.push(`/projects/dashboard/${conversationId}?mode=${savedMode}`)
    }
  }, [conversationId, router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-gray-400">Conversation not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Normal Memory</h1>
            <p className="text-sm text-gray-400">{conversation.name || `Project ${conversationId.slice(0, 8)}`}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => api.exportMemories(conversationId)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-sm transition-colors text-sm"
            >
              Export
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Human</span>
              <button
                onClick={() => handleModeChange(mode === 'human' ? 'dev' : 'human')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  mode === 'dev' ? 'bg-white' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-black rounded-full transition-transform ${
                    mode === 'dev' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-400">Dev</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <DashboardTabs mode={mode} onModeChange={handleModeChange} />

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {mode === 'human' ? (
          <YourMindTab conversationId={conversationId} />
        ) : (
          <DeveloperPortalTab conversationId={conversationId} />
        )}
      </div>
    </div>
  )
}

