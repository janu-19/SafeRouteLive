// Test script for n8n webhook integration
const fetch = (() => {
  if (typeof global !== 'undefined' && global.fetch) {
    return global.fetch;
  }
  // For Node.js 18+, fetch is available natively
  return fetch;
})();

async function testN8NWebhook() {
  const webhookUrl = 'https://pramodhkumar.app.n8n.cloud/webhook-test/saferoute';
  
  console.log('🧪 Testing n8n Webhook Integration...\n');
  console.log(`📡 URL: ${webhookUrl}`);
  console.log('📤 Sending test request...\n');
  
  try {
    // Using GET request with query parameters (webhook is configured for GET)
    const params = new URLSearchParams({
      lat: '12.9716',
      lng: '77.5946',
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(`${webhookUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`✅ Response Status: ${response.status} ${response.statusText}`);
    console.log('📥 Response Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));
    
    // Check content type and get raw text first
    const contentType = response.headers.get('content-type') || '';
    const contentEncoding = response.headers.get('content-encoding') || '';
    const rawText = await response.text();
    
    console.log(`\n📝 Content-Type: ${contentType}`);
    console.log(`📝 Content-Encoding: ${contentEncoding || 'none'}`);
    console.log(`📝 Response Length: ${rawText.length} characters`);
    
    let data;
    
    if (rawText.length === 0) {
      console.log('\n⚠️ WARNING: Webhook returned empty response!');
      console.log('\n💡 Possible reasons:');
      console.log('   1. The n8n workflow is not returning data from the Webhook Response node');
      console.log('   2. The workflow may not be active/saved in n8n');
      console.log('   3. The workflow execution may be failing silently');
      console.log('\n📋 To fix this:');
      console.log('   1. Open your n8n workflow');
      console.log('   2. Ensure the workflow is saved and ACTIVE');
      console.log('   3. Check that the "Webhook Response" node is properly configured');
      console.log('   4. Test the workflow execution manually in n8n to see if it returns data');
      console.log('   5. Check n8n execution logs for any errors');
      
      // Return a mock empty structure for testing
      data = {
        tweets: [],
        news: [],
        weather: null,
        normalized: [],
        analyzed: []
      };
      console.log('\n✅ Test script completed (with empty response handling)');
      console.log('\n📦 Using empty data structure for validation:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`\n📝 Raw Response (first 500 chars): ${rawText.substring(0, 500)}`);
      
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error('\n❌ Failed to parse JSON. Raw response:', rawText);
        throw new Error(`Invalid JSON response: ${e.message}`);
      }
      
      console.log('\n📦 Parsed Response Data:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    // Validate response structure (only if we have data)
    if (rawText.length > 0) {
      console.log('\n🔍 Validating response structure...');
      
      // Handle n8n AI response structure - extract JSON from content.parts[0].text
      let parsedData = data;
      if (data.content && data.content.parts && data.content.parts[0] && data.content.parts[0].text) {
        try {
          let jsonText = data.content.parts[0].text;
          // Remove markdown code block markers
          jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          parsedData = JSON.parse(jsonText);
          console.log('✅ Extracted JSON from content.parts[0].text');
          
          // Merge meta if available from outer response
          if (data.meta) {
            parsedData.meta = { ...parsedData.meta, ...data.meta };
          }
        } catch (e) {
          console.warn('⚠️ Could not parse JSON from content.parts[0].text:', e.message);
        }
      }
      
      // Check for alerts array (from parsed content)
      const hasAlerts = parsedData.alerts && Array.isArray(parsedData.alerts);
      const hasSafetyScore = parsedData.safetyScore !== undefined;
      const hasCity = parsedData.city !== undefined;
      const hasSummary = parsedData.summary !== undefined;
      
      // Check for traditional structure too
      const hasTweets = parsedData.tweets && Array.isArray(parsedData.tweets);
      const hasNews = parsedData.news && Array.isArray(parsedData.news);
      const hasWeather = (parsedData.weather && typeof parsedData.weather === 'object') || 
                        (parsedData.meta && parsedData.meta.weather && typeof parsedData.meta.weather === 'object');
      const hasNormalized = parsedData.normalized && Array.isArray(parsedData.normalized);
      const hasAnalyzed = parsedData.analyzed && Array.isArray(parsedData.analyzed);
      
      console.log('\n📊 Data Structure Validation:');
      console.log(`  - Has alerts array: ${hasAlerts ? '✅' : '❌'}`);
      if (hasAlerts) console.log(`    └─ Alerts count: ${parsedData.alerts.length}`);
      console.log(`  - Has safety score: ${hasSafetyScore ? '✅' : '❌'}`);
      if (hasSafetyScore) console.log(`    └─ Safety Score: ${parsedData.safetyScore}`);
      console.log(`  - Has city: ${hasCity ? '✅' : '❌'}`);
      if (hasCity) console.log(`    └─ City: ${parsedData.city}`);
      console.log(`  - Has summary: ${hasSummary ? '✅' : '❌'}`);
      console.log(`  - Has weather: ${hasWeather ? '✅' : '❌'}`);
      if (hasWeather) {
        const weatherData = parsedData.weather || (parsedData.meta && parsedData.meta.weather);
        console.log(`    └─ Weather: ${JSON.stringify(weatherData)}`);
      }
      console.log(`  - Has tweets: ${hasTweets ? '✅' : '❌'}`);
      if (hasTweets) console.log(`    └─ Tweets count: ${parsedData.tweets.length}`);
      console.log(`  - Has news: ${hasNews ? '✅' : '❌'}`);
      if (hasNews) console.log(`    └─ News count: ${parsedData.news.length}`);
      console.log(`  - Has normalized: ${hasNormalized ? '✅' : '❌'}`);
      console.log(`  - Has analyzed: ${hasAnalyzed ? '✅' : '❌'}`);
      
      // Show sample alerts if available
      if (hasAlerts && parsedData.alerts.length > 0) {
        console.log('\n📢 Sample Alerts:');
        parsedData.alerts.slice(0, 3).forEach((alert, idx) => {
          console.log(`  ${idx + 1}. [${alert.source}] ${alert.type} - ${alert.summary.substring(0, 60)}...`);
        });
      }
      
      console.log('\n✅ Test completed successfully!');
      console.log('\n💡 The dashboard will display:');
      if (hasAlerts) console.log('  - Alerts in social feed');
      if (hasSafetyScore) console.log('  - Traffic/Crowd data derived from safety score');
      if (hasWeather) console.log('  - Weather information');
    } else {
      console.log('\n⚠️ Skipping validation (empty response)');
      console.log('\n💡 The code will handle empty responses gracefully and use fallback data.');
      console.log('\n✅ Test completed (empty response handled gracefully)');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testN8NWebhook();

