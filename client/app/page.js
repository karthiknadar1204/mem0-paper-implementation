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
                A dedicated memory layer for your AI agents. Store, recall, and manage long-term context without the
                complexity of vector databases.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="#"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <Terminal className="w-4 h-4" />
                  npm install normalmemory
                </Link>
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
                  <div className="text-gray-500 mb-4">// Initialize normalmemory</div>
                  <div className="flex">
                    <span className="text-purple-400">import</span>
                    <span className="text-white mx-2">
                      {"{"} Memory {"}"}
                    </span>
                    <span className="text-purple-400">from</span>
                    <span className="text-green-400 mx-2">"normalmemory"</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-purple-400">const</span>
                    <span className="text-blue-400 mx-2">memory</span>
                    <span className="text-white">=</span>
                    <span className="text-purple-400 mx-2">new</span>
                    <span className="text-yellow-400">Memory</span>
                    <span className="text-gray-400">()</span>
                  </div>

                  <div className="text-gray-500 mt-6 mb-4">// Store user preferences</div>
                  <div>
                    <span className="text-purple-400">await</span>
                    <span className="text-blue-400 mx-1">memory</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-yellow-400">add</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-green-400">"User likes concise answers."</span>
                    <span className="text-gray-400">, {"{"}</span>
                  </div>
                  <div className="pl-4 text-blue-300">
                    userId: <span className="text-green-400">"alex_123"</span>
                  </div>
                  <div className="text-gray-400">{"})"}</div>

                  <div className="text-gray-500 mt-6 mb-4">// Retrieve context automatically</div>
                  <div>
                    <span className="text-purple-400">const</span>
                    <span className="text-blue-400 mx-2">context</span>
                    <span className="text-white">=</span>
                    <span className="text-purple-400 mx-2">await</span>
                    <span className="text-blue-400">memory</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-yellow-400">search</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-green-400">"How should I reply?"</span>
                    <span className="text-gray-400">)</span>
                  </div>
                  <div className="mt-4 text-gray-500">{">"} [ "User prefers concise answers." ]</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#050505]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Core Architecture</h2>
            <p className="text-gray-400 max-w-2xl">
              Built on a high-performance vector engine with graph-based relationships. Designed to be the hippocampus
              for your LLM applications.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Brain className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Adaptive Memory Graph</h3>
              <p className="text-gray-400 leading-relaxed">
                normalmemory doesn't just store vectors; it builds relationships between entities. If a user mentions
                they moved to New York, old location data is automatically deprecated while keeping historical context
                intact.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Zap className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Sub-20ms Latency</h3>
              <p className="text-gray-400 leading-relaxed">
                Optimized for real-time chat applications. Retrieval happens in parallel with LLM processing.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Lock className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Data Sovereignty</h3>
              <p className="text-gray-400 leading-relaxed">
                Run it locally via Docker or on your own VPC. Your memory data never leaves your infrastructure.
              </p>
            </div>
            <div className="md:col-span-2 bg-[#0a0a0a] border border-white/10 p-8 rounded-lg hover:border-white/20 transition-colors">
              <Layers className="w-10 h-10 text-white mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Universal API</h3>
              <p className="text-gray-400 leading-relaxed">
                Works with OpenAI, Anthropic, Llama, or any custom model. The memory layer is decoupled from the
                inference layer, allowing you to switch models without losing user context.
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
                Add long-term memory to your Vercel AI SDK, LangChain, or custom agent setup in lines of code.
              </p>

              <div className="space-y-6">
                {[
                  { title: "Initialize Client", desc: "Connect to your self-hosted or managed instance." },
                  { title: "Add Memories", desc: "Push unstructured text; we handle the embeddings." },
                  { title: "Query Context", desc: "Retrieve relevant memories based on semantic similarity." },
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
                <div className="text-white border-b border-white px-2 pb-4 -mb-4.5">api/chat/route.ts</div>
                <div className="px-2 pb-4 cursor-pointer hover:text-gray-300">lib/memory.ts</div>
              </div>
              <pre className="overflow-x-auto">
                {`export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // 1. Retrieve relevant context
  const context = await memory.search(lastMessage.content);
  
  // 2. Inject into system prompt
  const systemPrompt = \`
    You are a helpful assistant.
    Context: \${context.map(m => m.content).join("\\n")}
  \`;

  // 3. Generate response
  const result = await streamText({
    model: openai("gpt-4"),
    system: systemPrompt,
    messages,
  });

  // 4. Save new interaction asynchronously
  ctx.waitUntil(memory.add(lastMessage.content));

  return result.toUIMessageStreamResponse();
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#0a0a0a] border-y border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Advanced Agents</h2>
            <p className="text-gray-400">Solving the context window limit for real-world applications.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Personalized Tutors",
                desc: "Remember a student's learning progress, weak spots, and preferred explanation styles over months of sessions.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Customer Support",
                desc: "Recall previous tickets, user details, and specific issues without forcing the user to repeat themselves.",
              },
              {
                icon: <Activity className="w-6 h-6" />,
                title: "RPG NPCs",
                desc: "Create characters that remember past interactions with players, building evolving relationships and story arcs.",
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

      {/* Tech Stack - Simplified */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-gray-600 text-sm font-mono mb-10">COMPATIBLE WITH</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5" /> OpenAI
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <BoxIcon /> Anthropic
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5" /> Vercel AI SDK
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5" /> Pinecone
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden border-t border-white/10">
        <div className="container mx-auto max-w-4xl relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Start building stateful agents.</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#"
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
