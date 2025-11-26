'use client';

import { useState } from 'react';

const API_URL = 'http://localhost:5008';

export default function Home() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('say');

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage, method }]);

    try {
      const endpoint = method === 'say' ? '/say' : method === 'chat' ? '/chat' : '/ask';
      const bodyKey = method === 'ask' ? 'question' : 'message';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [bodyKey]: userMessage }),
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantContent = data.reply || data.response || data.answer;
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: assistantContent,
          method 
        }]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}`,
        method 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <div className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold mb-4">SDK Test Chat</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMethod('say')}
            className={`px-4 py-2 rounded ${method === 'say' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Say (Auto-route)
          </button>
          <button
            onClick={() => setMethod('chat')}
            className={`px-4 py-2 rounded ${method === 'chat' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setMethod('ask')}
            className={`px-4 py-2 rounded ${method === 'ask' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Ask
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            Start a conversation...
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              <div
                className={`text-xs mb-1 ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-600'
                }`}
              >
                {msg.method}
              </div>
              <div>{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-gray-900">
              <div className="text-gray-600">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type a ${method === 'ask' ? 'question' : 'message'}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !message.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
