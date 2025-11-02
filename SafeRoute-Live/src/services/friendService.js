const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get auth token
const getToken = () => localStorage.getItem('token');

// Get auth headers
const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/**
 * Get all friends
 */
export const getFriends = async () => {
  const response = await fetch(`${API_BASE_URL}/api/friends`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch friends');
  }
  
  return response.json();
};

/**
 * Get friend requests (sent and received)
 */
export const getFriendRequests = async () => {
  const response = await fetch(`${API_BASE_URL}/api/friends/requests`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch friend requests');
  }
  
  return response.json();
};

/**
 * Send friend request
 */
export const sendFriendRequest = async (recipientId) => {
  const response = await fetch(`${API_BASE_URL}/api/friends/request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipientId })
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send friend request');
  }
  
  return response.json();
};

/**
 * Accept friend request
 */
export const acceptFriendRequest = async (requestId) => {
  const response = await fetch(`${API_BASE_URL}/api/friends/accept/${requestId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to accept friend request');
  }
  
  return response.json();
};

/**
 * Delete/Reject friend request
 */
export const deleteFriendRequest = async (requestId) => {
  const response = await fetch(`${API_BASE_URL}/api/friends/request/${requestId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete friend request');
  }
  
  return response.json();
};

/**
 * Remove friend
 */
export const removeFriend = async (friendshipId) => {
  const response = await fetch(`${API_BASE_URL}/api/friends/${friendshipId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Failed to remove friend');
  }
  
  return response.json();
};

/**
 * Search users
 */
export const searchUsers = async (query) => {
  const response = await fetch(`${API_BASE_URL}/api/friends/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to search users');
  }
  
  return response.json();
};

