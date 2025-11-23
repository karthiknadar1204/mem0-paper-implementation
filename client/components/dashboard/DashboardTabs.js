"use client"

export default function DashboardTabs({ mode, onModeChange }) {
  return (
    <div className="border-b border-white/10 bg-[#0a0a0a]">
      <div className="container mx-auto px-6">
        <div className="flex gap-8">
          <button
            onClick={() => onModeChange('human')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              mode === 'human'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Your Mind
          </button>
          <button
            onClick={() => onModeChange('dev')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              mode === 'dev'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Developer Portal
          </button>
        </div>
      </div>
    </div>
  )
}

