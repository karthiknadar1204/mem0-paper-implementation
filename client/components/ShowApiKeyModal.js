"use client"

import { useState } from "react"
import { X, Copy, Check } from "lucide-react"

export default function ShowApiKeyModal({ isOpen, onClose, apiKey }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !apiKey) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-4">API Key Created</h2>
        <p className="text-sm text-gray-400 mb-4">
          Make sure to copy your API key now. You won't be able to see it again!
        </p>

        <div className="bg-[#050505] border border-white/10 rounded-sm p-4 mb-4">
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm text-white break-all">{apiKey}</code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 ml-2 p-2 text-gray-400 hover:text-white transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-white hover:bg-gray-200 text-black text-sm font-bold rounded-sm transition-colors"
        >
          I've copied it
        </button>
      </div>
    </div>
  )
}

