"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Brain, Zap, Lock, Activity, Database, Star, Cpu, Terminal, Globe, Shield, Layers } from "lucide-react"
import Link from "next/link"
import AuthModal from "../components/AuthModal"
import { api } from "../lib/api"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState("signup")
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const storedAuth = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(storedAuth)
  }, [])

  const handleLogout = async () => {
    try {
      await api.logout()
      setIsLoggedIn(false)
      localStorage.setItem('isLoggedIn', 'false')
      window.location.reload()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#333] selection:text-white overflow-x-hidden font-mono">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-[#050505]/80 border-b border-white/10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-sm" />
            </div>
            normalmemory
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="/documentation" className="hover:text-white transition-colors">
              Documentation
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link
                  href="/projects"
                  className="px-4 py-2 bg-white hover:bg-gray-200 text-black text-sm font-bold rounded-sm transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#111] hover:bg-[#222] text-white text-sm font-bold rounded-sm transition-colors border border-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode("login")
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 bg-[#111] hover:bg-[#222] text-white text-sm font-bold rounded-sm transition-colors border border-white/10"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode("signup")
                    setShowAuthModal(true)
                  }}
                  className="px-4 py-2 bg-white hover:bg-gray-200 text-black text-sm font-bold rounded-sm transition-colors"
                >
                  Signup
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="initial" animate="animate" variants={staggerContainer} className="text-left">
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111] border border-white/10 text-gray-400 text-xs font-medium mb-8 font-mono"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                System Operational
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight"
              >
                Memory for <br />
                <span className="text-gray-500">artificial intelligence.</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-lg md:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
                Persistent memory for AI applications. Smart routing, automatic memory extraction, and infinite context recall. 
                One SDK, three methods, unlimited conversations.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('npm install normal-memory')
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <Terminal className="w-4 h-4" />
                  npm install normalmemory
                </button>
                <Link
                  href="/documentation"
                  className="w-full sm:w-auto px-8 py-4 bg-[#111] hover:bg-[#222] text-white border border-white/10 rounded-sm transition-colors flex items-center justify-center gap-2"
                >
                  Read Documentation
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                <div className="flex items-center px-4 py-3 border-b border-white/5 bg-[#111]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <div className="ml-4 text-xs text-gray-500 font-mono">example.ts</div>
                </div>
                <div className="p-6 font-mono text-sm overflow-x-auto">
                  <div className="text-gray-500 mb-4">// Initialize SDK</div>
                  <div className="flex">
                    <span className="text-purple-400">import</span>
                    <span className="text-white mx-2">
                      {"{"} NormalMemory {"}"}
                    </span>
                    <span className="text-purple-400">from</span>
                    <span className="text-green-400 mx-2">"normal-memory"</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-purple-400">const</span>
                    <span className="text-blue-400 mx-2">memory</span>
                    <span className="text-white">=</span>
                    <span className="text-purple-400 mx-2">new</span>
                    <span className="text-yellow-400">NormalMemory</span>
                    <span className="text-gray-400">({"{"}</span>
                  </div>
                  <div className="pl-4 text-blue-300">
                    apiKey: <span className="text-green-400">"sk_..."</span>,
                  </div>
                  <div className="pl-4 text-blue-300">
                    conversationId: <span className="text-green-400">"..."</span>
                  </div>
                  <div className="text-gray-400">{"})"}</div>

                  <div className="text-gray-500 mt-6 mb-4">// Smart routing - auto-detects intent</div>
                  <div>
                    <span className="text-purple-400">await</span>
                    <span className="text-blue-400 mx-1">memory</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-yellow-400">say</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-green-400">"I'm Alex, I'm vegan"</span>
                    <span className="text-gray-400">)</span>
                  </div>

                  <div className="text-gray-500 mt-6 mb-4">// Memory recall - infinite context</div>
                  <div>
                    <span className="text-purple-400">const</span>
                    <span className="text-blue-400 mx-2">answer</span>
                    <span className="text-white">=</span>
                    <span className="text-purple-400 mx-2">await</span>
                    <span className="text-blue-400">memory</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-yellow-400">ask</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-green-400">"What's my diet?"</span>
                    <span className="text-gray-400">)</span>
                  </div>
                  <div className="mt-4 text-gray-500">{">"} "You're vegan, Alex."</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#050505]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Core Features</h2>
            <p className="text-gray-400 max-w-2xl">
              Built on PostgreSQL and Pinecone. Automatic memory extraction, smart routing, and infinite context recall.
              Designed to be the memory layer for your AI applications.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Brain className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Smart Routing</h3>
              <p className="text-gray-400 leading-relaxed">
                The <code className="text-white">.say()</code> method automatically detects user intent. Questions route to memory recall,
                statements route to conversation. No manual routing needed.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Zap className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Automatic Extraction</h3>
              <p className="text-gray-400 leading-relaxed">
                Memories are extracted automatically in the background. Facts, preferences, and entities are stored
                without manual intervention.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Database className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Infinite Context</h3>
              <p className="text-gray-400 leading-relaxed">
                The <code className="text-white">.ask()</code> method retrieves relevant memories from Pinecone, giving you
                unlimited context beyond token limits.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Activity className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Conversation Management</h3>
              <p className="text-gray-400 leading-relaxed">
                Multiple conversations per user. Each conversation maintains its own memory graph and summary.
                Switch between projects seamlessly.
              </p>
            </div>
            <div className="md:col-span-2 bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Layers className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Three Simple Methods</h3>
              <p className="text-gray-400 leading-relaxed">
                <code className="text-white">.say()</code> for smart routing, <code className="text-white">.chat()</code> for conversations,
                <code className="text-white">.ask()</code> for memory recall. That's it. No complex setup, no manual memory management.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Seamless Integration</h2>
              <p className="text-gray-400 mb-8">
                Add persistent memory to your AI applications in minutes. Works with any LLM, any framework.
              </p>

              <div className="space-y-6">
                {[
                  { title: "Install SDK", desc: "npm install normal-memory - one package, zero config." },
                  { title: "Initialize", desc: "Pass your API key and conversation ID. That's it." },
                  { title: "Use .say()", desc: "Smart routing handles everything. Questions → memory, statements → chat." },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center font-mono text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">{step.title}</h4>
                      <p className="text-sm text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 font-mono text-xs md:text-sm text-gray-400">
              <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                <div className="text-white border-b border-white px-2 pb-4 -mb-4.5">app.js</div>
              </div>
              <pre className="overflow-x-auto">
                {`import { NormalMemory } from 'normal-memory';

const memory = new NormalMemory({
  apiKey: 'sk_...',
  conversationId: '...',
});

// Smart routing - handles everything
await memory.say("I'm Alex, I'm vegan");

// Memory recall - infinite context
const answer = await memory.ask("What's my diet?");
// → "You're vegan, Alex."

// Direct conversation
const reply = await memory.chat("How are you?");
// → Immediate LLM response`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#0a0a0a] border-y border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Production</h2>
            <p className="text-gray-400">Real-world applications with persistent memory and smart routing.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Globe className="w-6 h-6" />,
                title: "AI Assistants",
                desc: "Remember user preferences, past conversations, and context across sessions. Smart routing handles questions and statements automatically.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Customer Support",
                desc: "Recall user history, preferences, and past issues. The .ask() method provides accurate memory-based answers instantly.",
              },
              {
                icon: <Activity className="w-6 h-6" />,
                title: "Conversational Apps",
                desc: "Multiple conversations per user. Each maintains its own memory graph. Switch between projects seamlessly with conversation IDs.",
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="bg-[#050505] border border-white/10 p-8 rounded-lg text-left hover:border-white/30 transition-all"
              >
                <div className="w-12 h-12 bg-[#111] rounded-lg flex items-center justify-center mb-6 text-white">
                  {useCase.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{useCase.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden border-t border-white/10">
        <div className="container mx-auto max-w-4xl relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Start building with persistent memory.</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/projects"
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-sm hover:bg-gray-200 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 bg-[#050505] text-sm text-gray-500 font-mono">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white rounded-sm" />
            <span className="font-bold text-white">normalmemory</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="#" className="hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              GitHub
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Twitter
            </Link>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onLoginSuccess={() => {
          setIsLoggedIn(true)
          localStorage.setItem('isLoggedIn', 'true')
        }}
      />
    </div>
  )
}

// Simple placeholder for Anthropic icon to avoid extra deps
function BoxIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}
