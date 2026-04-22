const API_URL = '/api';

export const api = {
  async get(endpoint) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`);
      if (!res.ok) throw new Error('Fetch failed');
      return await res.json();
    } catch (err) {
      console.warn(`Offline mode for GET ${endpoint}`);
      if (endpoint === '/employees') {
        return JSON.parse(localStorage.getItem('kcn_employees') || '[]');
      }
      return [];
    }
  },
  
  async post(endpoint, data) {
    if (!navigator.onLine) {
      if (endpoint === '/attendance') {
        const queue = JSON.parse(localStorage.getItem('kcn_sync_queue') || '[]');
        queue.push(data);
        localStorage.setItem('kcn_sync_queue', JSON.stringify(queue));
        return { success: true, offline: true, ...data };
      }
      throw new Error('Offline - action not supported');
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    let result;
    try {
      result = await res.json();
    } catch(e) {
      throw new Error(`Server Error (${res.status}). Ensure the backend is active.`);
    }
    if (!res.ok) throw new Error(result.message || 'Error occurred');
    return result;
  },

  async delete(endpoint) {
    if (!navigator.onLine) throw new Error('Offline');
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE' });
    return await res.json();
  },

  async put(endpoint, data) {
    if (!navigator.onLine) throw new Error('Offline');
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    let result;
    try {
      result = await res.json();
    } catch(e) {
      throw new Error(`Server Error (${res.status}). Ensure the backend is active.`);
    }
    if (!res.ok) throw new Error(result.message || 'Error occurred');
    return result;
  },

  async syncOffline() {
    if (!navigator.onLine) return;
    const queue = JSON.parse(localStorage.getItem('kcn_sync_queue') || '[]');
    if (queue.length > 0) {
      try {
        await fetch(`${API_URL}/attendance/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queue)
        });
        localStorage.setItem('kcn_sync_queue', '[]');
      } catch (err) {
        console.error('Sync failed', err);
      }
    }
  }
};
