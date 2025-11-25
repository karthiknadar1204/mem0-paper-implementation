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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

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
                  <div className="text-gray-500 mb-4">// Initialize SDK (model agnostic)</div>
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
                    apiKey: <span className="text-green-400">"sk_backend_api_key"</span>,
                  </div>
                  <div className="pl-4 text-blue-300">
                    conversationId: <span className="text-green-400">"conversation-id"</span>,
                  </div>
                  <div className="pl-4 text-blue-300">
                    baseUrl: <span className="text-green-400">"https://api.normalmemory.com"</span>,
                  </div>
                  <div className="pl-4 text-blue-300">
                    llmProvider: <span className="text-green-400">process.env.LLM_PROVIDER</span>,
                  </div>
                  <div className="pl-4 text-blue-300">
                    llmApiKey: <span className="text-green-400">process.env.LLM_API_KEY</span>,
                  </div>
                  <div className="pl-4 text-gray-500">// Bring your own OpenAI or Gemini key</div>
                  <div className="pl-4 text-blue-300">
                    llmModel: <span className="text-green-400">process.env.LLM_MODEL</span>,
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

                  <div className="text-gray-500 mt-6 mb-4">// Direct conversation (Gemini or OpenAI)</div>
                  <div>
                    <span className="text-purple-400">const</span>
                    <span className="text-blue-400 mx-2">reply</span>
                    <span className="text-white">=</span>
                    <span className="text-purple-400 mx-2">await</span>
                    <span className="text-blue-400">memory</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-yellow-400">chat</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-green-400">"How's my day looking?"</span>
                    <span className="text-gray-400">)</span>
                  </div>
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
              <Globe className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Model-Agnostic LLMs</h3>
              <p className="text-gray-400 leading-relaxed">
                Bring any OpenAI or Gemini chat model with your own API key. We validate providers/models, never store your key, and route calls through secure BullMQ workers.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Brain className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Smart Routing (.say)</h3>
              <p className="text-gray-400 leading-relaxed">
                The <code className="text-white">.say()</code> method auto-detects intent. Questions route to retrieval, statements route to conversation—no manual branching.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Zap className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Automatic Extraction</h3>
              <p className="text-gray-400 leading-relaxed">
                Memories are extracted asynchronously. Facts, preferences, and entities flow into PostgreSQL + Pinecone without manual tagging.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Database className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Infinite Context</h3>
              <p className="text-gray-400 leading-relaxed">
                The <code className="text-white">.ask()</code> method retrieves top memories from Pinecone, giving you context far beyond token limits.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Activity className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Background Jobs & Logging</h3>
              <p className="text-gray-400 leading-relaxed">
                BullMQ workers handle extraction, summaries, and request logging. Track API usage via <code className="text-white">api_requests</code> and <code className="text-white">retrieval_logs</code>.
              </p>
            </div>
            <div className="md:col-span-2 bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Layers className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Dashboard + SDK</h3>
              <p className="text-gray-400 leading-relaxed">
                Ship fast with the project dashboard, developer portal, and three SDK methods: <code className="text-white">.say()</code>, <code className="text-white">.chat()</code>, <code className="text-white">.ask()</code>.
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
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center font-mono text-sm">
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
                <div className="text-white border-b border-white px-2 pb-4 -mb-4.5">server.js</div>
              </div>
              <pre className="overflow-x-auto">
{`import express from 'express';
import { NormalMemory } from 'normal-memory';

const app = express();
app.use(express.json());

const memory = new NormalMemory({
  apiKey: process.env.NORMAL_MEMORY_KEY,
  conversationId: process.env.CONVERSATION_ID,
  baseUrl: process.env.NORMAL_MEMORY_URL,
  llmProvider: process.env.LLM_PROVIDER,
  llmApiKey: process.env.LLM_API_KEY,
  llmModel: process.env.LLM_MODEL,
});

app.post('/chat', async (req, res) => {
  const reply = await memory.chat(req.body.message);
  res.json({ reply });
});

app.post('/ask', async (req, res) => {
  const answer = await memory.ask(req.body.question);
  res.json({ answer });
});

app.listen(4000, () => console.log('SDK test server running on port 4000'));`}
              </pre>
            </div>
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
