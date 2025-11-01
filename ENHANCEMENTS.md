# AI-Enhanced Safe Routes Feature

## Overview
This document describes the AI-like and adaptive safety features added to the Safe Routes application.

## New Features

### 1. ⚙️ Dynamic Safety Weights

**Backend Implementation:**
- **Night Time (8 PM - 6 AM)**: Lighting weight increased by +0.2 (from 0.4 to 0.6)
- **Monsoon Months (June-September)**: Accident factor increased by +0.15 (15% penalty)

**Location:** `server/index.js` - `calculateSafetyScore()` function

**How it works:**
- Automatically detects current time and month
- Adjusts safety score calculations based on time and season
- Reflects these conditions in the returned metadata

### 2. 💬 User Feedback Integration

**Backend:**
- `POST /api/feedback` endpoint stores user feedback
- In-memory feedback store (mock DB) tracks:
  - Total feedback count
  - Safe vs unsafe counts
  - Adjusts weight factors based on feedback patterns

**Frontend:**
- `FeedbackModal.jsx` component shows modal after route completion
- Modal appears when:
  - User clicks "Mark Route as Complete" button, or
  - Automatically after estimated travel time (demo mode)

**Weight Adjustment Logic:**
- If 70%+ users report unsafe → decreases lighting weight by 10%
- If 70%+ users report unsafe → increases accident penalty by 10%
- Feedback is cumulative and affects future route calculations

**Location:**
- Backend: `server/index.js` - `getAdjustedWeights()` function
- Frontend: `SafeRoute-Live/src/components/FeedbackModal.jsx`

### 3. 🤖 AI Safety Suggestions

**Backend:**
- `GET /api/ai-safety-suggestion` endpoint analyzes:
  - Current time and conditions
  - Route safety scores
  - Accident rates
  - Crowd density

**Returns:**
- Best departure time recommendation
- Safest route comparison (e.g., "Try Route 2 — 20% safer than Route 1")
- Contextual suggestions based on:
  - Time of day (night/day)
  - Monsoon season
  - Current conditions

**Frontend:**
- `AISuggestionModal.jsx` displays suggestions in a beautiful modal
- "Get AI Safety Suggestion" button appears after routes are found
- Auto-closes after 10 seconds (optional)

**Location:**
- Backend: `server/index.js` - `/api/ai-safety-suggestion` route
- Frontend: `SafeRoute-Live/src/components/AISuggestionModal.jsx`

### 4. 🧩 UI Enhancements

#### Safety Trend Icons
- **🌙 Night Icon**: Appears on routes when it's night time (8 PM - 6 AM)
  - Tooltip: "Night time - Enhanced lighting weight applied"
- **🌧️ Monsoon Icon**: Appears during monsoon months (June-September)
  - Tooltip: "Monsoon season - Accident factor increased"

**Location:** `SafeRoute-Live/src/components/RouteCard.jsx`

#### AI Recommended Tag
- Dynamic "🤖 AI Recommended" badge appears on the safest route
- Gradient purple-to-blue badge with smooth animation
- Updates automatically when routes change

**Location:** `SafeRoute-Live/src/components/RouteCard.jsx`

#### Smooth Animations
- Route cards fade in with staggered animation
- Hover effects with scale transformation
- Modal animations using Framer Motion:
  - Spring animations for smooth entry/exit
  - Backdrop blur effects
  - Scale and fade transitions

**Location:**
- Route cards: `SafeRoute-Live/src/components/RouteCard.jsx`
- Modals: `SafeRoute-Live/src/components/FeedbackModal.jsx` and `AISuggestionModal.jsx`

## API Endpoints

### POST /api/feedback
**Request Body:**
```json
{
  "routeId": "route-0",
  "feedback": "safe" | "unsafe",
  "safetyScore": 85
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback recorded successfully",
  "feedbackStats": {
    "total": 10,
    "safe": 7,
    "unsafe": 3,
    "safeRatio": "0.70"
  }
}
```

### GET /api/ai-safety-suggestion
**Query Parameters:**
- `source`: Source location
- `destination`: Destination location
- `routes`: JSON stringified array of routes with safety scores

**Response:**
```json
{
  "success": true,
  "recommendation": {
    "safestRoute": {
      "id": "route-0",
      "name": "Well-lit Main Roads",
      "safetyScore": 92
    },
    "recommendationText": "Try Well-lit Main Roads — 20% safer than Crowded Streets",
    "bestDepartureTime": {
      "hour": 14,
      "formatted": "2:00 PM",
      "reason": "Daytime travel provides better visibility and higher crowd density"
    },
    "currentConditions": {
      "isNight": false,
      "isMonsoon": true,
      "currentHour": 15
    },
    "suggestions": [
      "Best departure time: 2:00 PM (20% safer)",
      "⚠️ Monsoon season detected - Exercise extra caution"
    ]
  }
}
```

## Component Structure

```
SafeRoute-Live/src/
├── components/
│   ├── RouteCard.jsx          # Enhanced with icons, AI badge, animations
│   ├── FeedbackModal.jsx       # User feedback modal
│   ├── AISuggestionModal.jsx  # AI suggestions display
│   └── ...
├── pages/
│   └── RoutePlanner.jsx        # Main page with all integrations
└── utils/
    └── api.js                  # API functions including feedback and AI suggestion
```

## How to Test

1. **Dynamic Weights:**
   - Change system time to night (after 8 PM) → See 🌙 icon and higher lighting weight
   - Change system date to June-September → See 🌧️ icon and increased accident factor

2. **User Feedback:**
   - Find routes
   - Click "Mark Route as Complete"
   - Submit feedback (Safe/Unsafe)
   - Submit multiple unsafe feedbacks → See weight adjustments in future routes

3. **AI Suggestions:**
   - Find routes
   - Click "🤖 Get AI Safety Suggestion"
   - View recommendations for:
     - Best departure time
     - Safest route comparison
     - Contextual tips

4. **UI Enhancements:**
   - See safety trend icons on route cards
   - See "AI Recommended" badge on safest route
   - Hover over route cards for smooth animations
   - Watch modal animations when feedback/suggestions appear

## Future Enhancements

1. **Real-time Location Tracking**: Integrate actual GPS to detect route completion
2. **Machine Learning**: Use feedback data to train ML models for better predictions
3. **Weather API**: Integrate real weather data for more accurate monsoon detection
4. **Historical Data**: Store feedback in database for long-term analysis
5. **Personalization**: Adjust weights based on individual user feedback patterns

## Notes

- All features work with mock data (no external API keys required)
- Structure is ready for real API integration
- Feedback system uses in-memory storage (resets on server restart)
- Route completion is simulated (use "Mark Route as Complete" button for demo)

