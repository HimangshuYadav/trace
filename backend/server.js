const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Middleware
app.use(cors()); // Allow cross-origin requests from frontend (Port 3000)
app.use(express.json());

// Seeding helper to create user parameters (for the exploration profile Taylor Young)
const getSeedData = (name, email, password) => ({
  email,
  password, // stored as cleartext for simplicity in this development prototype
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

// Database initialization
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    // Seed with a default user "Taylor Young" for immediate exploration
    const defaultData = {
      users: [
        getSeedData("Taylor Young", "taylor@trace.earth", "password")
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    console.log("Database initialized and seeded.");
  } else {
    console.log("Database file found.");
  }
}

function readDb() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return { users: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing database:", err);
  }
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
    // Decode token which is simple base64 of email
    const email = Buffer.from(token, 'base64').toString('utf-8');
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

  const newUser = getNewUserData(name, email.toLowerCase(), password);
  db.users.push(newUser);
  writeDb(db);

  const token = Buffer.from(newUser.email).toString('base64');
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

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  const token = Buffer.from(user.email).toString('base64');
  res.json({ success: true, token, user: { name: user.name, email: user.email } });
});

// GET Profile
app.get('/api/profile', authenticateToken, (req, res) => {
  // Strip password for safety
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
      ? getSeedData(req.user.name, req.user.email, req.user.password)
      : getNewUserData(req.user.name, req.user.email, req.user.password);
    db.users[index] = freshUser;
    writeDb(db);
    res.json({ success: true, message: "User statistics reset successfully." });
  } else {
    res.status(404).json({ success: false, message: "User not found." });
  }
});

app.listen(PORT, () => {
  console.log(`  Trace API Server listening on http://localhost:${PORT}`);
});
