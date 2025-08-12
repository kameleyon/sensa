const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testAPI() {
  console.log('Testing Sensacall Backend API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Health Check:');
    const health = await axios.get('http://localhost:3001/health');
    console.log('   ✓ Server is healthy:', health.data.status);
    console.log();

    // Test 2: Register User
    console.log('2. User Registration:');
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      username: `testuser_${Date.now()}`
    };
    
    try {
      const register = await axios.post(`${API_URL}/auth/register`, testUser);
      console.log('   ✓ User registered successfully');
      console.log('   - Token received:', register.data.token ? 'Yes' : 'No');
      console.log('   - User ID:', register.data.user.id);
      console.log('   - Subscription:', register.data.user.subscription_tier);

      const token = register.data.token;

      // Test 3: Login
      console.log('\n3. User Login:');
      const login = await axios.post(`${API_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      console.log('   ✓ Login successful');
      console.log('   - Token received:', login.data.token ? 'Yes' : 'No');

      // Test 4: Get Agents (with authentication)
      console.log('\n4. Get Agents:');
      const agents = await axios.get(`${API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✓ Agents fetched:', agents.data.agents.length, 'agents');
      console.log('   - User tier:', agents.data.userTier);

      // Test 5: Get User Profile
      console.log('\n5. Get User Profile:');
      const profile = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✓ Profile fetched');
      console.log('   - Username:', profile.data.profile.username);
      console.log('   - Email:', profile.data.profile.email);

      // Test 6: Get User Preferences
      console.log('\n6. Get User Preferences:');
      const preferences = await axios.get(`${API_URL}/users/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✓ Preferences fetched');
      console.log('   - Theme:', preferences.data.preferences.theme);
      console.log('   - Language:', preferences.data.preferences.language);

    } catch (error) {
      if (error.response?.status === 409) {
        console.log('   ⚠ User already exists (expected for repeated tests)');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All API tests passed successfully!');

  } catch (error) {
    console.error('\n❌ API test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testAPI();