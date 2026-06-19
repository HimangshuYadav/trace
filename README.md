# Trace — Every choice, counted.

Trace is a responsive carbon footprint tracker that helps individuals understand, measure, and meaningfully reduce their environmental impact through daily habit logging and personalized insights.

---

## 1. Chosen Vertical: Personal Carbon Tracking & Sustainability Action

Trace targets environmentally conscious individuals (typically aged 22–40) who want to act on climate change but find existing carbon tools overwhelming, complex, or guilt-laden.

### Design Philosophy
* **Calm & Scientific**: Draws visual inspiration from data journalism publications and sustainable product brands rather than alarming crisis messaging.
* **Clarity & Agency**: Uses a clean, harmonized palette (Cream `#FAF8F5`, Forest Green `#2D5016`, and Amber warning highlights `#C97B2A`) to show real progress without inducing shame.
* **Tabular Numbers & Monospace Alignments**: All numbers utilize `JetBrains Mono` with `font-variant-numeric: tabular-nums` to ensure structured, scientific data grids.

---

## 2. Approach and Logic

Trace is implemented using a **split multi-tier architecture** that separates the user interface from the API and data storage:

1. **Static Frontend Client (Port 3000)**: Serves HTML, CSS, and client-side JavaScript. Uses a custom Single Page Application (SPA) routing engine template setup.
2. **Node.js Express API Backend (Port 5001)**: Provides REST API endpoints for user validation, habit logging, insights configuration, and statistics resets.
3. **Database JSON File Store**: Multi-user statistics are persisted inside a local database file (`backend/data/db.json`), ensuring strict data isolation across accounts.

---

## 3. How the Solution Works

### A. Authentication & Session Flow
* **Sign Up**: Creating an account initializes a dynamic zero-baseline state (`0.0` today's total, `0` day streak) rather than preloading mock template data. 
* **Sign In**: Verifies credentials and generates a session token using a Base64-encoded representation of the email.
* **Client Persistence**: The session token is stored in the browser's `localStorage`. The frontend attaches this token to the `Authorization: Bearer <token>` header for all protected API calls.

### B. Carbon Footprint Calculations
When a user logs a habit, the backend calculates the footprint in real time using the following formula:
$$\text{Added CO}_2\text{ (kg)} = \text{Factor} \times \text{Quantity}$$
*(For Transportation, the quantity is divided by 10 to represent emissions per 10 km).*

Standard carbon factors used:
* **Transport (per 10 km)**: Average Car ($2.1$), Train ($0.4$), Electric Bus ($0.6$), Cycling ($0.0$).
* **Food (per serving)**: Red Meat ($3.2$), Fish/Poultry ($1.1$), Vegetarian ($0.6$), Vegan ($0.3$).
* **Energy (per kWh)**: Gas Heat ($2.0$), Grid Elec ($0.8$), Solar/Renewable ($0.1$).
* **Shopping (per item)**: Fast Fashion ($6.2$), Gadget/Electronics ($18.5$), Secondhand ($0.5$).

### C. Live Interactive Visuals
* **Weekly Bar Chart (Dashboard)**: Automatically determines the calendar dates for the current week (Monday-Sunday) and maps `progressHistory` values to their specific days. Unlogged days render as `0.0` (rather than hardcoded mock defaults), and bars turn Amber (`#C97B2A`) if they breach the user's daily target ($10.0$ kg CO₂).
* **Progress Line Graph (SVG)**: Dynamically scales user footprint values to the SVG coordinate space ($1000 \times 280$ viewBox). Implements a hover listener that snaps a crosshair guide to the active data node, displaying tooltips that seamlessly revert to today's stats on mouse-leave.
* **Achievements & Milestones**: Programmatic evaluation locks/unlocks milestones:
  * *First steps*: Handled dynamically based on the date of your first log.
  * *On target*: Unlocked when you have at least 3 days below your daily limit.
  * *Habit builder*: Unlocked when your logging streak reaches 7 days.
  * *Carbon saver*: Unlocked when your cumulative saved carbon vs. baseline exceeds 20.0 kg CO₂.

---

## 4. Assumptions Made

1. **Clean Slate Assumption**: Newly registered users should start with a zero baseline to track their actual progress. For immediate exploration, a pre-seeded account is provided:
   * **Explorer Login**: `taylor@trace.earth` / `password` (pre-populated with 9-day streak, 10-point history, and active habits).
2. **Session Security Prototyping**: Base64 encoding/decoding of the email string is used as authentication tokens. This satisfies user isolation and session persistence without adding heavy external crypto libraries that trigger native compilation errors during testing runs.
3. **Graphing Coordinate Safety**: For new accounts containing only a single log entry, the coordinate algorithm defaults to centering the point at X = 500 to prevent division-by-zero errors.

---

## 5. Development Setup & Deployment

### Run Locally
1. Install dependencies for the backend:
   ```bash
   npm install --prefix backend
   ```
2. Start both the backend (Port 5001) and frontend (Port 3000) concurrently:
   ```bash
   npm run dev
   ```

### Deploy Backend (Node)
Deploy the `/backend` folder to a service like Render or Railway. Make sure to update the `API_BASE` variable in `frontend/app.js` to point to your live backend endpoint.

### Deploy Frontend (Static)
Deploy the static `/frontend` directory to **GitHub Pages**:
```bash
cd frontend
npm run deploy
```
*(Uses the configured `gh-pages` script to push assets to the `gh-pages` branch).*
