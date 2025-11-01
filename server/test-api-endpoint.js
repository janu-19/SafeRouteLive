// Test the /api/getN8NData endpoint
const fetch = (() => {
  if (typeof global !== 'undefined' && global.fetch) {
    return global.fetch;
  }
  return fetch;
})();

async function testAPIEndpoint() {
  const apiUrl = 'http://localhost:3001/api/getN8NData?lat=12.9716&lng=77.5946';
  
  console.log('🧪 Testing API Endpoint: /api/getN8NData\n');
  console.log(`📡 URL: ${apiUrl}\n`);
  
  try {
    const response = await fetch(apiUrl);
    console.log(`✅ Response Status: ${response.status} ${response.statusText}\n`);
    
    const data = await response.json();
    console.log('📦 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ API endpoint is working correctly!');
      console.log(`   - Social Feed Items: ${data.data.socialFeed?.length || 0}`);
      console.log(`   - Has Weather: ${data.data.weather ? 'Yes' : 'No'}`);
      console.log(`   - Has Traffic: ${data.data.traffic ? 'Yes' : 'No'}`);
      console.log(`   - Has Crowd Density: ${data.data.crowdDensity ? 'Yes' : 'No'}`);
    } else {
      console.log('\n⚠️ API endpoint returned success: false');
      console.log(`   Error: ${data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.log('\n💡 Make sure the server is running:');
    console.log('   cd server && npm start');
  }
}

testAPIEndpoint();

