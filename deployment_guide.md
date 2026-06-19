# Deployment Guide

Trace is built with a **split architecture**:
* **Frontend**: Static files (HTML, CSS, JS) served on Port `3000`.
* **Backend**: Node.js Express server on Port `5001` interacting with a JSON file database.

Because GitHub Pages only supports static hosting, it cannot run the Node.js Express server or persist database writes. You must deploy them separately.

---

## Step 1: Deploy the Node.js Backend

You can deploy the backend for free to services like **Render**, **Railway**, or **Fly.io**.

### Example: Deploying to Render
1. Go to [Render](https://render.com/) and create a free account.
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository `HimangshuYadav/trace`.
4. Configure the Web Service settings:
   * **Name**: `trace-api` (or any name)
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
5. Click **Deploy Web Service**.
6. Once deployed, copy your backend URL (e.g., `https://trace-api.onrender.com`).

---

## Step 2: Point Frontend to Live Backend

Once your backend is deployed, update your frontend to request data from the live server instead of `localhost`.

1. Open [frontend/app.js](file:///Users/himangshuyadav/Desktop/trace/frontend/app.js) in your codebase.
2. Edit `API_BASE` (line 6) to point to your live backend URL:
   ```javascript
   const API_BASE = 'https://trace-api.onrender.com'; // Replace with your Render URL
   ```
3. Commit and push this change to GitHub:
   ```bash
   git add frontend/app.js
   git commit -m "config: point frontend to live backend URL"
   git push origin main
   ```

---

## Step 3: Deploy Frontend to GitHub Pages

To deploy the static `frontend` folder directly to GitHub Pages, we can use the `gh-pages` npm utility.

### Option A: Automatic via Command Line (Recommended)
1. Navigate to the `frontend` folder in your terminal:
   ```bash
   cd frontend
   ```
2. Install the `gh-pages` utility:
   ```bash
   npm install gh-pages --save-dev
   ```
3. Open `frontend/package.json` and add `predeploy` and `deploy` scripts:
   ```json
   "scripts": {
     "dev": "npx -y serve -l 3000",
     "predeploy": "npm run build --if-present",
     "deploy": "gh-pages -d ."
   }
   ```
4. Run the deploy script:
   ```bash
   npm run deploy
   ```
   This will automatically create a `gh-pages` branch on GitHub, build your static files, and push them to host on GitHub Pages.

5. Go to your GitHub repository settings, click **Pages** on the left menu, and ensure the source is set to deploy from the `gh-pages` branch.

### Option B: Deploying manually via GitHub settings
If you prefer not to use `gh-pages` packages:
1. Move the files from inside `/frontend` (index.html, style.css, app.js) to the repository root directory.
2. Update the imports or package paths if needed.
3. Push to GitHub.
4. Go to **Settings -> Pages** on GitHub, select the `main` branch, and set folder to `/ (root)`.
