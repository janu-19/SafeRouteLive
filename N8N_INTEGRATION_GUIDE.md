# n8n Automation Integration Guide

This guide explains how to integrate your n8n automation workflow with the SafeRoute Live dashboard to replace predefined data with real-time data from your automation.

## Overview

Your n8n workflow fetches:
- **Tweets** from Twitter API
- **News** from NewsAPI
- **Weather** from OpenWeather API

Then it:
- Normalizes the data
- Analyzes it with AI
- Merges and formats it
- Returns it via Webhook Response

The dashboard now uses this real-time data instead of mock/predefined data for:
- Social Media Live Feed (tweets and news)
- Traffic Status
- Crowd Density
- Weather Information

## Step 1: Get Your n8n Webhook URL

### Method 1: From the Webhook Trigger Node

1. **Open your n8n workflow** in the n8n interface
   - Navigate to your workflow that contains the webhook trigger

2. **Click on the "Webhook Trigger" node** (the first node on the left side of your workflow)

3. **Find the Webhook URL**
   - In the node settings, look for **"Production URL"** or **"Test URL"**
   - The URL format is: `https://your-domain.n8n.cloud/webhook/your-webhook-id`
   - Example: `https://pramodhkumar.app.n8n.cloud/webhook/ZDLzKLGuQBGKqd4I`

4. **Copy the URL**
   - Click the copy button next to the URL or manually copy it
   - **Important**: Use the **Production URL** for live use, or **Test URL** for testing

### Method 2: From Workflow Settings

1. Open your workflow
2. Click on the workflow name or settings
3. Look for "Webhook" or "Trigger" section
4. Copy the webhook URL

## Step 2: Configure the Webhook URL

### Option A: Environment Variable (Recommended)

1. **Create or edit `.env` file** in the `server/` directory:
   ```bash
   cd server
   ```

2. **Add the webhook URL**:
   ```env
   N8N_WEBHOOK_URL=https://your-domain.n8n.cloud/webhook/your-webhook-id
   ```

3. **Restart your server** for changes to take effect

### Option B: Update Default URL in Code

If you don't want to use environment variables, you can update the default URL in `server/index.js`:

1. Open `server/index.js`
2. Find the line with `getDataFromN8N` function (around line 564)
3. Update the default URL:
   ```javascript
   const n8nWorkflowUrl = process.env.N8N_WEBHOOK_URL || 'https://your-domain.n8n.cloud/webhook/your-webhook-id';
   ```

## Step 3: Verify Your n8n Workflow

### Expected Response Format

Your n8n workflow should return data in one of these formats:

#### Format 1: Structured Object (Recommended)
```json
{
  "tweets": [
    {
      "id": "123",
      "text": "Accident reported at MG Road",
      "timestamp": 1234567890,
      "url": "https://twitter.com/..."
    }
  ],
  "news": [
    {
      "id": "456",
      "title": "Traffic update",
      "description": "Road closure",
      "source": { "name": "NewsAPI" },
      "publishedAt": 1234567890,
      "url": "https://..."
    }
  ],
  "weather": {
    "temp": 25,
    "condition": "Sunny",
    "humidity": 60,
    "windSpeed": 15
  },
  "normalized": [
    {
      "text": "Traffic is moderate",
      "source": "AI Analysis",
      "type": "traffic",
      "timestamp": 1234567890
    }
  ],
  "analyzed": [
    {
      "message": "Traffic level: Moderate",
      "category": "traffic",
      "level": "Moderate",
      "value": 50
    }
  ]
}
```

#### Format 2: Direct Array
If your workflow returns data directly in the webhook response, the code will automatically adapt.

### Testing Your Webhook

You can test your webhook URL directly:

```bash
curl -X POST https://your-domain.n8n.cloud/webhook/your-webhook-id \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lng": 77.5946, "timestamp": "2024-01-01T00:00:00Z"}'
```

Or use a tool like Postman or Thunder Client to test it.

## Step 4: How the Dashboard Uses n8n Data

### Social Feed
- **Source**: `tweets`, `news`, `normalized`, and `analyzed` arrays from n8n
- **Update Frequency**: Every 30 seconds
- **Display**: Shows in the "Live Social Feed" panel with source attribution

### Traffic Status
- **Source**: `analyzed` array items with `type: "traffic"` or `category: "traffic"`
- **Update Frequency**: Every 30 seconds
- **Fallback**: If no n8n data, uses random simulation

### Crowd Density
- **Source**: `analyzed` array items with `type: "crowd"` or `category: "crowd"`
- **Update Frequency**: Every 30 seconds
- **Fallback**: If no n8n data, uses random simulation

### Weather Data
- **Source**: `weather` object from n8n response
- **Future Use**: Ready to display weather information if needed

## Step 5: Troubleshooting

### Issue: Dashboard shows "No social feed data from n8n"

**Solutions:**
1. Check that your webhook URL is correct in environment variables
2. Verify the n8n workflow is active and saved
3. Check server logs for errors: `⚠️ Error fetching data from n8n`
4. Test the webhook URL directly (see Step 3)
5. Verify your n8n workflow returns data in the expected format

### Issue: Traffic/Crowd data not updating

**Solutions:**
1. Ensure your `analyzed` array includes items with `type: "traffic"` or `type: "crowd"`
2. Check that these items have `level` and `value` properties
3. Verify the data format matches the expected structure

### Issue: Webhook returns 404 or 500 error

**Solutions:**
1. Make sure the workflow is saved and active in n8n
2. Verify you're using the correct webhook URL (Production vs Test)
3. Check that the webhook trigger node is enabled
4. Review n8n execution logs for workflow errors

### Issue: CORS errors

**Solutions:**
1. If running n8n locally, ensure CORS is configured
2. For n8n.cloud, CORS should be handled automatically
3. Check server logs for detailed error messages

## Step 6: Monitoring

### Server Logs

Watch your server console for messages:
- `✅ Fetched X items from n8n workflow` - Success
- `⚠️ Error fetching data from n8n: ...` - Error details
- `⚠️ n8n workflow failed, falling back to ...` - Fallback triggered

### Dashboard Console

Open browser DevTools (F12) and check the Console tab for:
- `✅ Loaded X items from n8n automation` - Data loaded successfully
- `⚠️ Error fetching social feed from n8n` - Fetch error

## Advanced: Customizing Data Transformation

If your n8n workflow returns data in a different format, you can customize the transformation in `server/index.js`:

1. Locate the `getDataFromN8N` function
2. Modify the data mapping logic to match your n8n response format
3. Update the transformation to extract traffic/crowd data as needed

## Need Help?

- Check n8n documentation: https://docs.n8n.io/
- Review server logs for detailed error messages
- Test your webhook URL independently before integrating

