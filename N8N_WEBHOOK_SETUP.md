# n8n Webhook Response Node Setup

## Issue: Data shows in n8n output but webhook returns empty

If you see data in the n8n output tab but the webhook returns empty, the **Webhook Response** node is not properly configured to return the data.

## Steps to Fix:

### 1. Check Webhook Response Node Connection
- The **Webhook Response** node must be connected to your **AI Analyze** or **Merge & Format** node
- It should be the LAST node in your workflow (after data processing)

### 2. Configure Webhook Response Node
- Click on the **Webhook Response** node
- In the node settings, you need to specify **what data to return**

#### Option A: Return All Data (Recommended)
- Set **"Response Data"** to `{{ $json }}` 
- This returns all data from the previous node

#### Option B: Return Specific Fields
If you want to return only specific data:
```json
{
  "alerts": {{ $json.alerts }},
  "safetyScore": {{ $json.safetyScore }},
  "meta": {{ $json.meta }}
}
```

### 3. Check Your Workflow Structure
Your workflow should look like:
```
Webhook Trigger → Fetch Tweets → ┐
                    Fetch News → → Normalize Sources → AI Analyze → Webhook Response
                    Fetch Weather → ┘
```

### 4. Test the Workflow
1. Click **"Execute Workflow"** in n8n
2. Wait for execution to complete
3. Check the **Webhook Response** node output - it should show the data being returned
4. Run the test script: `node test-n8n.js`
5. The webhook should now return data

### 5. Common Issues

#### Issue: Webhook Response node not connected
- **Fix**: Drag a connection from AI Analyze → Webhook Response

#### Issue: Webhook Response node returns nothing
- **Fix**: Set Response Data to `{{ $json }}` to return all data

#### Issue: Data structure not matching
- The code expects: `content.parts[0].text` containing JSON
- If your AI Analyze node outputs directly, you might need to wrap it

### 6. Expected Response Format

The webhook should return either:

**Format A (AI Response with content.parts):**
```json
{
  "content": {
    "parts": [{
      "text": "```json\n{\"alerts\": [...], \"safetyScore\": 65}\n```"
    }]
  },
  "meta": {
    "weather": {...}
  }
}
```

**Format B (Direct JSON):**
```json
{
  "alerts": [...],
  "safetyScore": 65,
  "city": "Exampleville",
  "meta": {
    "weather": {...}
  }
}
```

The code handles both formats automatically.

### 7. Debugging Tips

1. **Check n8n execution logs**: Look for errors in node execution
2. **Inspect Webhook Response output**: Click on the node after execution to see what it's returning
3. **Test with simple data first**: Return `{{ $json }}` to see if connection works
4. **Check webhook URL**: Make sure you're using the correct test/production URL

### 8. Quick Test

After configuring, execute the workflow in n8n, then immediately run:
```bash
node test-n8n.js
```

You should see:
- ✅ Response Status: 200 OK
- ✅ Extracted JSON from content.parts[0].text
- ✅ Has alerts array: ✅
- ✅ Has safety score: ✅

If you still see empty response, double-check the Webhook Response node configuration!

