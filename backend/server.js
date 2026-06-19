const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5001;

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(cors()); // Allow cross-origin requests from frontend (Port 3000)
app.use(express.json());

// HMAC secret for cryptographically signing sessions
const JWT_SECRET = crypto.randomBytes(32).toString('hex');

// Password security helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword.includes(':')) {
    // Fallback for cleartext passwords (seeding context)
    return password === storedPassword;
  }
  const [salt, hash] = storedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Session signing helpers
function generateToken(email) {
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(email).digest('base64url');
  return `${email}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const lastDotIndex = token.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  const email = token.substring(0, lastDotIndex);
  const signature = token.substring(lastDotIndex + 1);
  
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(email).digest('base64url');
  if (signature === expectedSignature) {
    return email;
  }
  return null;
}

// Seeding helper to create user parameters (for the exploration profile Taylor Young)
const getSeedData = (name, email, password) => ({
  email,
  password, // stored securely as a PBKDF2 hash
  name,
  target: 10.0,
  streak: 9,
  bestDay: 3.9,
  today: 7.4,
  weekTotal: 41.2,
  categories: {
    transport: 4.1,
    food: 2.2,
    energy: 0.8,
    shopping: 0.3
  },
  progressHistory: [
    { date: "Jun 1", value: 10.0 },
    { date: "Jun 3", value: 9.0 },
    { date: "Jun 5", value: 10.7 },
    { date: "Jun 7", value: 12.3 },
    { date: "Jun 9", value: 11.0 },
    { date: "Jun 11", value: 14.0 },
    { date: "Jun 13", value: 13.0 },
    { date: "Jun 15", value: 15.5 },
    { date: "Jun 17", value: 14.7 },
    { date: "Jun 19 (Today)", value: 7.4 }
  ],
  insights: [
    { 
      id: 1, 
      category: "food", 
      impact: "high", 
      heading: "Switch to a plant-based lunch three times a week", 
      saves: "Saves up to 4.2 kg CO₂/week — 12.0% of your current footprint", 
      body: "Your food footprint has been 38.0% above your target for the past 3 weeks.", 
      highlighted: true, 
      dismissed: false, 
      active: false 
    },
    { 
      id: 2, 
      category: "transport", 
      impact: "high", 
      heading: "Car pool or take transit for your daily commute", 
      saves: "Saves up to 8.4 kg CO₂/week — 24.0% of your current footprint", 
      body: "Your transport footprint is the single largest contributor to your environmental impact.", 
      dismissed: false, 
      active: false 
    },
    { 
      id: 3, 
      category: "energy", 
      impact: "medium", 
      heading: "Unplug electronic devices when not in use", 
      saves: "Saves up to 1.5 kg CO₂/week — 4.0% of your current footprint", 
      body: "Standby power accounts for roughly 8.0% of your monthly household energy usage.", 
      dismissed: false, 
      active: false 
    },
    { 
      id: 4, 
      category: "shopping", 
      impact: "medium", 
      heading: "Opt for secondhand clothing items this month", 
      saves: "Saves up to 6.2 kg CO₂/item — 18.0% of your current footprint", 
      body: "New clothing production carries high manufacturing and transportation footprints.", 
      dismissed: false, 
      active: false 
    }
  ]
});

// Helper to create dynamic blank/actual parameters for newly signed-up accounts
const getNewUserData = (name, email, password) => {
  const todayLabel = `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Today)`;
  return {
    email,
    password,
    name,
    target: 10.0,
    streak: 0,
    bestDay: 0.0,
    today: 0.0,
    weekTotal: 0.0,
    categories: {
      transport: 0.0,
      food: 0.0,
      energy: 0.0,
      shopping: 0.0
    },
    progressHistory: [
      { date: todayLabel, value: 0.0 }
    ],
    insights: [
      { 
        id: 1, 
        category: "food", 
        impact: "high", 
        heading: "Switch to a plant-based lunch three times a week", 
        saves: "Saves up to 4.2 kg CO₂/week", 
        body: "Switching to plant-based options significantly lowers emissions compared to red meat.", 
        highlighted: true, 
        dismissed: false, 
        active: false 
      },
      { 
        id: 2, 
        category: "transport", 
        impact: "high", 
        heading: "Car pool or take transit for your daily commute", 
        saves: "Saves up to 8.4 kg CO₂/week", 
        body: "Public transit and carpooling split commute footprint over multiple passengers.", 
        dismissed: false, 
        active: false 
      },
      { 
        id: 3, 
        category: "energy", 
        impact: "medium", 
        heading: "Unplug electronic devices when not in use", 
        saves: "Saves up to 1.5 kg CO₂/week", 
        body: "Standby power accounts for roughly 8% of monthly household energy usage.", 
        dismissed: false, 
        active: false 
      },
      { 
        id: 4, 
        category: "shopping", 
        impact: "medium", 
        heading: "Opt for secondhand clothing items this month", 
        saves: "Saves up to 6.2 kg CO₂/item", 
        body: "Manufacturing and transporting new clothing has a high carbon intensity.", 
        dismissed: false, 
        active: false 
      }
    ]
  };
};

// In-Memory database caching to optimize event-loop efficiency
let dbInMemory = { users: [] };

// Database initialization
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    // Seed with a default user "Taylor Young" for immediate exploration
    const defaultData = {
      users: [
        getSeedData("Taylor Young", "taylor@trace.earth", hashPassword("password"))
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    dbInMemory = defaultData;
    console.log("Database initialized and seeded.");
  } else {
    try {
      dbInMemory = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      console.log("Database loaded into memory cache.");
    } catch (err) {
      console.error("Error reading database:", err);
      dbInMemory = { users: [] };
    }
  }
}

function readDb() {
  return dbInMemory;
}

function writeDb(data) {
  dbInMemory = data;
  // Non-blocking asynchronous writing to prevent blocking the event-loop
  fs.writeFile(DB_FILE, JSON.stringify(dbInMemory, null, 2), 'utf-8', (err) => {
    if (err) {
      console.error("Asynchronous database write error:", err);
    }
  });
}

initDb();

// ==========================================================================
// AUTHENTICATION MIDDLEWARE
// ==========================================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided." });
  }
  
  try {
    // Verify HMAC-signed cryptographic session token
    const email = verifyToken(token);
    if (!email) {
      return res.status(403).json({ success: false, message: "Invalid or forged session token." });
    }
    
    const db = readDb();
    const user = db.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(403).json({ success: false, message: "Invalid session token." });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Session verification error." });
  }
}

// ==========================================================================
// REST API ENDPOINTS
// ==========================================================================

// Sign Up Route
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Missing sign up parameters." });
  }

  const db = readDb();
  const exists = db.users.find(u => u.email === email.toLowerCase());
  
  if (exists) {
    return res.status(400).json({ success: false, message: "Email is already registered." });
  }

  const newUser = getNewUserData(name, email.toLowerCase(), hashPassword(password));
  db.users.push(newUser);
  writeDb(db);

  const token = generateToken(newUser.email);
  console.log(`Registered user: ${newUser.name} (${newUser.email})`);
  res.json({ success: true, token, user: { name: newUser.name, email: newUser.email } });
});

// Login Route
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Missing login parameters." });
  }

  const db = readDb();
  const user = db.users.find(u => u.email === email.toLowerCase());

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  const token = generateToken(user.email);
  res.json({ success: true, token, user: { name: user.name, email: user.email } });
});

// GET Profile
app.get('/api/profile', authenticateToken, (req, res) => {
  const profile = { ...req.user };
  delete profile.password;
  res.json(profile);
});

// GET Progress History
app.get('/api/history', authenticateToken, (req, res) => {
  res.json(req.user.progressHistory);
});

// GET Insights
app.get('/api/insights', authenticateToken, (req, res) => {
  const visible = req.user.insights.filter(ins => !ins.dismissed);
  res.json(visible);
});

// POST Dismiss Insight
app.post('/api/insights/dismiss', authenticateToken, (req, res) => {
  const { id } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email === req.user.email);
  const insight = user.insights.find(ins => ins.id === Number(id));
  
  if (insight) {
    insight.dismissed = true;
    writeDb(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Insight not found." });
  }
});

// POST Try Action
app.post('/api/insights/try', authenticateToken, (req, res) => {
  const { id } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email === req.user.email);
  const insight = user.insights.find(ins => ins.id === Number(id));
  
  if (insight) {
    insight.active = true;
    writeDb(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Insight not found." });
  }
});

// POST Log Activity
app.post('/api/log', authenticateToken, (req, res) => {
  const { category, activityName, quantity, factor } = req.body;
  
  if (!category || !activityName || quantity === undefined || !factor) {
    return res.status(400).json({ success: false, message: "Missing log parameters." });
  }

  const db = readDb();
  const user = db.users.find(u => u.email === req.user.email);
  
  // Calculate footprint
  let added = 0;
  if (category === 'transport') {
    added = factor * (quantity / 10);
  } else {
    added = factor * quantity;
  }
  
  added = Math.round(added * 10) / 10;
  
  // Update state fields
  user.today = Math.round((user.today + added) * 10) / 10;
  user.categories[category] = Math.round((user.categories[category] + added) * 10) / 10;
  user.weekTotal = Math.round((user.weekTotal + added) * 10) / 10;
  
  // Sync history today's entry
  const todayEntry = user.progressHistory.find(h => h.date.includes('Today'));
  if (todayEntry) {
    todayEntry.value = user.today;
  } else {
    user.progressHistory[user.progressHistory.length - 1].value = user.today;
  }

  writeDb(db);
  
  res.json({ success: true, user, added });
});

// POST Reset Database (for specific user)
app.post('/api/reset', authenticateToken, (req, res) => {
  const db = readDb();
  const index = db.users.findIndex(u => u.email === req.user.email);
  if (index !== -1) {
    const freshUser = req.user.email === 'taylor@trace.earth'
      ? getSeedData(req.user.name, req.user.email, hashPassword("password"))
      : getNewUserData(req.user.name, req.user.email, req.user.password);
    db.users[index] = freshUser;
    writeDb(db);
    res.json({ success: true, message: "User statistics reset successfully." });
  } else {
    res.status(404).json({ success: false, message: "User not found." });
  }
});

// Export elements for unit testing
module.exports = {
  app,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getSeedData,
  getNewUserData,
  JWT_SECRET
};

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`  Trace API Server listening on http://localhost:${PORT}`);
  });
}
