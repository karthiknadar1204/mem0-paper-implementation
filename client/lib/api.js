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
      // Check health endpoint with credentials to verify cookie
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        credentials: 'include',
      });
      // If we have a token in localStorage, assume we're authenticated
      // The actual auth will be checked on protected routes
      return localStorage.getItem('isLoggedIn') === 'true';
    } catch (error) {
      return false;
    }
  },
};

