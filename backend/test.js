const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Configure test database file path before importing server modules
const TEST_DB_FILE = path.join(__dirname, 'test_db.json');
process.env.DB_FILE = TEST_DB_FILE;

const { 
  app,
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken, 
  getNewUserData 
} = require('./server');

// Cleanup helper
function cleanupTestDb() {
  if (fs.existsSync(TEST_DB_FILE)) {
    try {
      fs.unlinkSync(TEST_DB_FILE);
    } catch (e) {
      // Ignore cleanup error
    }
  }
}

// Ensure clean environment
cleanupTestDb();

test('Password Hashing Verification via Scrypt', () => {
  const password = "mySecretPassword123";
  const hashed = hashPassword(password);
  
  assert.ok(hashed.includes(':'), 'Hash should contain salt-hash separator');
  assert.strictEqual(verifyPassword(password, hashed), true, 'Password verification should succeed');
  assert.strictEqual(verifyPassword("wrongPassword", hashed), false, 'Incorrect password should fail verification');
});

test('Session Token Cryptographic Signatures & Expiry', async () => {
  const email = "test@example.com";
  const token = generateToken(email);
  
  // Format validation
  assert.ok(token.includes('.'), 'Token should be dot-separated payload and signature');
  
  // Signature verify
  const verifiedEmail = verifyToken(token);
  assert.strictEqual(verifiedEmail, email, 'Token verify should return email');
  
  // Forged signature reject
  const parts = token.split('.');
  const forgedToken = `${parts[0]}.${parts[1]}.forgedSignature`;
  assert.strictEqual(verifyToken(forgedToken), null, 'Forged signatures must be rejected');
});

test('New User Profile Initialization', () => {
  const name = "Alice Green";
  const email = "alice@example.com";
  const password = "myHashedPassword";
  
  const user = getNewUserData(name, email, password);
  
  assert.strictEqual(user.name, name);
  assert.strictEqual(user.email, email);
  assert.strictEqual(user.password, password);
  assert.strictEqual(user.streak, 0, 'New users start with a 0-day streak');
  assert.strictEqual(user.today, 0.0, 'New users start with 0.0 today footprint');
});

test('API Endpoint Route Integration Tests', async (t) => {
  // Start Express application on random available port (0)
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  
  // Clean up server on finish
  t.after(() => {
    server.close();
    cleanupTestDb();
  });
  
  const testEmail = `integration_${Date.now()}@test.com`;
  let authToken = '';

  // 1. Sign Up Endpoint
  const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "Integration Tester", email: testEmail, password: "password123" })
  });
  assert.strictEqual(signupRes.status, 200);
  const signupData = await signupRes.json();
  assert.strictEqual(signupData.success, true);
  assert.ok(signupData.token);
  authToken = signupData.token;

  // 2. Login Endpoint
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: "password123" })
  });
  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);

  // 3. GET Profile Endpoint (Authorized)
  const profileRes = await fetch(`${baseUrl}/api/profile`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(profileRes.status, 200);
  const profileData = await profileRes.json();
  assert.strictEqual(profileData.name, "Integration Tester");
  assert.strictEqual(profileData.email, testEmail);

  // 4. GET Profile Endpoint (Unauthorized)
  const unauthRes = await fetch(`${baseUrl}/api/profile`);
  assert.strictEqual(unauthRes.status, 401);
});
