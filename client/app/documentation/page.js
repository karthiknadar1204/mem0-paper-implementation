"use client"

import Link from "next/link"

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-[#050505]/80 border-b border-white/10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-sm" />
            </div>
            normalmemory
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm hover:text-gray-300 transition-colors">
              Home
            </Link>
            <Link href="/documentation" className="text-sm text-white font-semibold">
              Documentation
            </Link>
            <Link href="/projects" className="text-sm hover:text-gray-300 transition-colors">
              Projects
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 pt-24 pb-20 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Documentation</h1>

        {/* Installation */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Installation</h2>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
            <pre className="text-sm text-gray-300">
              <code>npm install normal-memory</code>
            </pre>
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
            <pre className="text-sm text-gray-300 overflow-x-auto">
              <code>{`import { NormalMemory } from 'normal-memory';

// Initialize SDK
const memory = new NormalMemory({
  apiKey: 'sk_...',                                                              // Required: Your API key
  conversationId: '...',                                                         // Required: Conversation ID
  baseUrl: 'https://mem0-paper-implementation-production.up.railway.app',        // Optional: Backend URL
});

// Use it!
await memory.say("Hi, I'm Alex");
const answer = await memory.ask("What's my name?");`}</code>
            </pre>
          </div>
        </section>

        {/* Core Methods */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Core Methods</h2>
          
          <div className="space-y-6">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">memory.say(message)</h3>
              <p className="text-gray-400 mb-4">Main method that automatically routes to chat or ask based on message content.</p>
              <pre className="text-sm text-gray-300 bg-[#050505] p-4 rounded">
                <code>{`await memory.say("I'm feeling great!");
await memory.say("What do you remember about me?");`}</code>
              </pre>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">memory.chat(message)</h3>
              <p className="text-gray-400 mb-4">Normal conversation with immediate LLM response.</p>
              <pre className="text-sm text-gray-300 bg-[#050505] p-4 rounded">
                <code>{`const reply = await memory.chat("Hi, I'm Alex");
// → "Hey Alex! Nice to meet you."`}</code>
              </pre>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">memory.ask(question)</h3>
              <p className="text-gray-400 mb-4">Ask questions using long-term memory.</p>
              <pre className="text-sm text-gray-300 bg-[#050505] p-4 rounded">
                <code>{`const answer = await memory.ask("Where do I live?");
// → Uses stored memories to answer`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Configuration</h2>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
            <pre className="text-sm text-gray-300 overflow-x-auto">
              <code>{`const memory = new NormalMemory({
  apiKey: 'sk_...',              // Required
  conversationId: '...',         // Required
  baseUrl: 'https://...',        // Optional: defaults to http://localhost:4000
  model: 'gpt-4o-mini',          // Optional
  smartRouting: true,            // Optional: enable smart routing
});`}</code>
            </pre>
          </div>
        </section>

        {/* API Reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">API Reference</h2>
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">say(message: string): Promise&lt;string&gt;</h3>
              <p className="text-sm text-gray-400">Automatically routes to chat or ask based on message content.</p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">chat(message: string): Promise&lt;string&gt;</h3>
              <p className="text-sm text-gray-400">Normal conversation with immediate LLM response.</p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">ask(question: string): Promise&lt;string&gt;</h3>
              <p className="text-sm text-gray-400">Ask question using long-term memory.</p>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Requirements</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Node.js &gt;= 18.0.0</li>
            <li>Valid API key from your backend</li>
            <li>Valid conversation ID</li>
            <li>Running Normal Memory backend server</li>
          </ul>
        </section>

        {/* Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Resources</h2>
          <div className="space-y-2">
            <a 
              href="https://www.npmjs.com/package/normal-memory" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 underline"
            >
              npm Package
            </a>
            <a 
              href="https://github.com/yourusername/normal-memory" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 underline"
            >
              GitHub Repository
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}

