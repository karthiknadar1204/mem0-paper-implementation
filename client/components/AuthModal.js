"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { api } from "../lib/api"

export default function AuthModal({ isOpen, onClose, mode = "signup", onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(mode === "signup")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignup) {
        if (!name || !email || !password) {
          setError("All fields are required")
          setLoading(false)
          return
        }
        await api.register(name, email, password)
        alert("Account created successfully! Please login.")
        setIsSignup(false)
        setName("")
      } else {
        if (!email || !password) {
          setError("Email and password are required")
          setLoading(false)
          return
        }
        await api.login(email, password)
        onLoginSuccess?.()
        onClose()
        setTimeout(() => {
          window.location.href = '/projects'
        }, 100)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

        <h2 className="text-2xl font-bold mb-6">
          {isSignup ? "Sign Up" : "Log In"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-[#050505] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[#050505] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#050505] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-white hover:bg-gray-200 text-black text-sm font-bold rounded-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : isSignup ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setIsSignup(false)}
                className="text-white hover:underline"
              >
                Log In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setIsSignup(true)}
                className="text-white hover:underline"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

