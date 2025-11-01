/**
 * Share Service
 * Handles API calls for location sharing feature
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Get JWT token from localStorage
 */
const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Make authenticated API request
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  if (!token) {
    console.error('❌ No token found in localStorage');
    throw new Error('Authentication required. Please login. Set token with: localStorage.setItem("token", "<your-token>")');
  }

  console.log('🔑 Making request with token:', token.substring(0, 50) + '...');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    console.error('❌ API Error:', error);
    console.error('Response status:', response.status);
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
};

/**
 * Create a location sharing request
 * @param {string} toUserId - Target user ID
 * @returns {Promise<object>} Request data
 */
export const requestLocationShare = async (toUserId) => {
  return apiRequest('/api/share/request', {
    method: 'POST',
    body: JSON.stringify({ toUserId })
  });
};

/**
 * Get all share requests (inbound and outbound)
 * @returns {Promise<object>} Requests data
 */
export const getShareRequests = async () => {
  return apiRequest('/api/share/requests');
};

/**
 * Approve a share request
 * @param {string} requestId - Request ID
 * @returns {Promise<object>} Session data
 */
export const approveShareRequest = async (requestId) => {
  return apiRequest(`/api/share/requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approve: true })
  });
};

/**
 * Reject a share request
 * @param {string} requestId - Request ID
 * @returns {Promise<object>} Response data
 */
export const rejectShareRequest = async (requestId) => {
  return apiRequest(`/api/share/requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approve: false })
  });
};

/**
 * Revoke a pending request
 * @param {string} requestId - Request ID
 * @returns {Promise<object>} Response data
 */
export const revokeShareRequest = async (requestId) => {
  return apiRequest(`/api/share/requests/${requestId}/revoke`, {
    method: 'POST'
  });
};

/**
 * Revoke an active sharing session
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} Response data
 */
export const revokeShareSession = async (sessionId) => {
  return apiRequest(`/api/share/session/${sessionId}/revoke`, {
    method: 'POST'
  });
};

/**
 * Get active sessions
 * @returns {Promise<object>} Sessions data
 */
export const getActiveSessions = async () => {
  return apiRequest('/api/share/sessions');
};

/**
 * Start direct location sharing (no approval needed)
 * @param {string} toUserId - Target user ID (optional)
 * @param {string} toUsername - Target username/email/phone (optional)
 * @returns {Promise<object>} Session data
 */
export const startDirectShare = async (toUserId, toUsername) => {
  const body = {};
  if (toUserId) body.toUserId = toUserId;
  if (toUsername) body.toUsername = toUsername;
  
  return apiRequest('/api/share/direct', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

/**
 * Search users by username/email/phone
 * @param {string} query - Search query
 * @returns {Promise<object>} Users data
 */
export const searchUsers = async (query) => {
  return apiRequest(`/api/share/users/search?q=${encodeURIComponent(query)}`);
};

