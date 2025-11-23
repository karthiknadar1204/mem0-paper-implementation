"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import AskAnythingBox from "./YourMind/AskAnythingBox"
import MemoryList from "./YourMind/MemoryList"
import OnThisDay from "./YourMind/OnThisDay"
import SearchBar from "./YourMind/SearchBar"
import MemoryOfTheDay from "./YourMind/MemoryOfTheDay"
import TimelineView from "./YourMind/TimelineView"

export default function YourMindTab({ conversationId }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const data = await api.getMemories(conversationId, 50, 0)
        setMemories(data)
      } catch (error) {
        console.error('Error fetching memories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMemories()
  }, [conversationId])

  const handleMemoryAdded = async () => {
    try {
      const data = await api.getMemories(conversationId, 50, 0)
      setMemories(data)
    } catch (error) {
      console.error('Error refreshing memories:', error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Ask Anything Box */}
      <AskAnythingBox conversationId={conversationId} />

      {/* Memory of the Day */}
      <MemoryOfTheDay conversationId={conversationId} />

      {/* On This Day */}
      <OnThisDay conversationId={conversationId} />

      {/* Search Bar */}
      <SearchBar conversationId={conversationId} />

      {/* Timeline View */}
      <TimelineView conversationId={conversationId} />

      {/* Memory List */}
      <MemoryList 
        conversationId={conversationId} 
        initialMemories={memories}
        onMemoryAdded={handleMemoryAdded}
        loading={loading}
      />
    </div>
  )
}

