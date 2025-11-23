const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = {
  async register(name, email, password) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  },

  async login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  async logout() {
    const response = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    return response.json();
  },

  async checkAuth() {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        credentials: 'include',
      });
      return localStorage.getItem('isLoggedIn') === 'true';
    } catch (error) {
      return false;
    }
  },

  async getConversations() {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch conversations');
    }

    return response.json();
  },

  async createConversation(name) {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create conversation');
    }

    return response.json();
  },

  async getApiKeys() {
    const response = await fetch(`${API_URL}/api-keys`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch API keys');
    }

    return response.json();
  },

  async createApiKey(name) {
    const response = await fetch(`${API_URL}/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create API key');
    }

    return response.json();
  },

  // Dashboard - Your Mind tab
  async getMemories(conversationId, limit = 50, offset = 0) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch memories');
    }

    return response.json();
  },

  async getOnThisDay(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories/on-this-day`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch on this day memories');
    }

    return response.json();
  },

  async searchMemories(conversationId, query) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search memories');
    }

    return response.json();
  },

  async getRandomMemory(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories/random`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch random memory');
    }

    return response.json();
  },

  async getTimeline(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories/timeline`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch timeline');
    }

    return response.json();
  },

  async exportMemories(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories/export`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export memories');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memories-${conversationId}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async askQuestion(conversationId, question) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to ask question');
    }

    return response.json();
  },

  // Dashboard - Developer Portal tab
  async getApiUsage(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/analytics/usage`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch API usage');
    }

    return response.json();
  },

  async getVectorHealth(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/analytics/vector-health`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch vector health');
    }

    return response.json();
  },

  async addManualMemory(conversationId, content) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add manual memory');
    }

    return response.json();
  },

  async getRawMemories(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/memories/raw`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch raw memories');
    }

    return response.json();
  },

  async getRequestLogs(conversationId) {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/analytics/requests`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch request logs');
    }

    return response.json();
  },
};

