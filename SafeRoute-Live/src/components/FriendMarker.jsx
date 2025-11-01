import { useEffect, useRef } from 'react';
import * as MapView from './MapView.jsx';

// Color palette for different friends
const FRIEND_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1'  // indigo
];

/**
 * Get color for friend based on index
 */
function getFriendColor(friendIndex) {
  return FRIEND_COLORS[friendIndex % FRIEND_COLORS.length];
}

/**
 * FriendMarker Component
 * Displays a friend's location on the map
 */
function FriendMarker({ map, location, userId, friendIndex = 0 }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !location) {
      return;
    }

    const coordinates = [location.longitude, location.latitude];
    const color = getFriendColor(friendIndex);

    // Create or update marker
    if (!markerRef.current) {
      const popupText = location.userName 
        ? `Live from ${location.userName}`
        : `Friend: ${userId}`;
      
      markerRef.current = MapView.addMarker(map, coordinates, {
        color: color,
        scale: 1,
        rotation: location.heading || 0,
        popupText: popupText
      });
    } else {
      MapView.updateMarker(markerRef.current, coordinates, location.heading || 0);
    }

    // Cleanup
    return () => {
      if (markerRef.current) {
        MapView.removeMarker(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, location, userId, friendIndex]);

  return null;
}

/**
 * FriendMarkers Component
 * Manages multiple friend markers
 */
export function FriendMarkers({ map, friends }) {
  return (
    <>
      {friends.map((friend, index) => (
        <FriendMarker
          key={friend.userId || friend.userName || index}
          map={map}
          location={{
            ...friend.location,
            userName: friend.userName,
            lastUpdate: friend.lastUpdate
          }}
          userId={friend.userId || friend.userName}
          friendIndex={index}
        />
      ))}
    </>
  );
}

export default FriendMarker;
