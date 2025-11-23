"use client"

import { useState } from "react"
import { api } from "@/lib/api"

export default function AskAnythingBox({ conversationId }) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    setAnswer("")
    try {
      const response = await api.askQuestion(conversationId, question)
      setAnswer(response.answer)
    } catch (error) {
      console.error('Error asking question:', error)
      setAnswer("Sorry, I couldn't answer that question.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Ask Anything</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do you want to know about yourself?"
          className="w-full h-32 bg-[#050505] border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 resize-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="w-full px-6 py-3 bg-white hover:bg-gray-200 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>
      {answer && (
        <div className="mt-6 p-4 bg-[#050505] border border-white/10 rounded-lg">
          <p className="text-white whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  )
}

