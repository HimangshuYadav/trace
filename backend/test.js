const test = require('node:test');
const assert = require('node:assert');
const { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken, 
  getNewUserData 
} = require('./server');

test('Password Hashing Verification', () => {
  const password = "mySecretPassword123";
  const hashed = hashPassword(password);
  
  // Assert hash format
  assert.ok(hashed.includes(':'), 'Hash should contain salt-hash separator');
  
  // Verify correct password
  assert.strictEqual(verifyPassword(password, hashed), true, 'Password verification should succeed');
  
  // Verify incorrect password
  assert.strictEqual(verifyPassword("wrongPassword", hashed), false, 'Incorrect password should fail verification');
});

test('Session Token Cryptographic Signatures', () => {
  const email = "test@example.com";
  const token = generateToken(email);
  
  // Assert token format
  assert.ok(token.includes('.'), 'Token should be structured as email.signature');
  
  // Verify valid token
  assert.strictEqual(verifyToken(token), email, 'Verify valid token should return correct email');
  
  // Verify tampered token
  const parts = token.split('.');
  const tamperedToken = `${parts[0]}.forgedSignature`;
  assert.strictEqual(verifyToken(tamperedToken), null, 'Tampered signatures must be rejected');
  
  // Verify invalid token layout
  assert.strictEqual(verifyToken("invalidLayout"), null, 'Invalid layouts must be rejected');
});

test('New User Profile Initialization', () => {
  const name = "Alice Green";
  const email = "alice@example.com";
  const password = "myHashedPassword";
  
  const user = getNewUserData(name, email, password);
  
  // Assert statistics initialized to zero / baseline values
  assert.strictEqual(user.name, name);
  assert.strictEqual(user.email, email);
  assert.strictEqual(user.password, password);
  assert.strictEqual(user.streak, 0, 'New users should start with a 0-day streak');
  assert.strictEqual(user.today, 0.0, 'New users should start with 0.0 today footprint');
  assert.strictEqual(user.weekTotal, 0.0, 'New users should start with 0.0 week footprint');
  
  // Assert category breakdown initialized to zero
  assert.strictEqual(user.categories.transport, 0.0);
  assert.strictEqual(user.categories.food, 0.0);
  assert.strictEqual(user.categories.energy, 0.0);
  assert.strictEqual(user.categories.shopping, 0.0);
  
  // Assert daily starting history node
  assert.strictEqual(user.progressHistory.length, 1);
  assert.strictEqual(user.progressHistory[0].value, 0.0);
});
