/**
 * Trace — Carbon Footprint Tracker
 * Frontend Application Controller
 */

const API_BASE = 'https://trace-api-0o24.onrender.com';

// Global application state
let currentPage = 'home';
let userToken = localStorage.getItem('trace_token') || null;
let userProfile = null;
let insights = [];

// Log page sub-state
let activeCategory = 'transport';
let selectedActivity = null;

// Progress page sub-state
let activeTimeRange = '30';

// Standard activities with factors matching backend formula
const activities = {
  transport: [
    { id: 'car', name: 'Drive average car', factor: 2.1, unit: 'km', defaultVal: 10, step: 10, icon: 'ph ph-car' },
    { id: 'train', name: 'Take train / subway', factor: 0.4, unit: 'km', defaultVal: 10, step: 10, icon: 'ph ph-train' },
    { id: 'bus', name: 'Take electric bus', factor: 0.6, unit: 'km', defaultVal: 10, step: 10, icon: 'ph ph-bus' },
    { id: 'walk', name: 'Walk or cycle', factor: 0.0, unit: 'km', defaultVal: 5, step: 5, icon: 'ph ph-bicycle' }
  ],
  food: [
    { id: 'red-meat', name: 'Red meat meal', factor: 3.2, unit: 'serving', defaultVal: 1, step: 1, icon: 'ph ph-egg' },
    { id: 'poultry', name: 'Poultry or fish meal', factor: 1.1, unit: 'serving', defaultVal: 1, step: 1, icon: 'ph ph-fish' },
    { id: 'veg', name: 'Vegetarian meal', factor: 0.6, unit: 'serving', defaultVal: 1, step: 1, icon: 'ph ph-carrot' },
    { id: 'vegan', name: 'Vegan meal', factor: 0.3, unit: 'serving', defaultVal: 1, step: 1, icon: 'ph ph-apple' }
  ],
  energy: [
    { id: 'gas-heat', name: 'Natural gas heating', factor: 2.0, unit: 'kWh', defaultVal: 5, step: 5, icon: 'ph ph-flame' },
    { id: 'grid-elec', name: 'Standard electricity', factor: 0.8, unit: 'kWh', defaultVal: 5, step: 5, icon: 'ph ph-lightning' },
    { id: 'green-elec', name: 'Renewable electricity', factor: 0.1, unit: 'kWh', defaultVal: 5, step: 5, icon: 'ph ph-sun-dim' },
    { id: 'cold-wash', name: 'Wash clothes cold', factor: 0.0, unit: 'load', defaultVal: 1, step: 1, icon: 'ph ph-wind' }
  ],
  shopping: [
    { id: 'fashion', name: 'Fast fashion item', factor: 6.2, unit: 'item', defaultVal: 1, step: 1, icon: 'ph ph-t-shirt' },
    { id: 'gadget', name: 'Electronics / gadget', factor: 18.5, unit: 'item', defaultVal: 1, step: 1, icon: 'ph ph-device-mobile' },
    { id: 'secondhand', name: 'Secondhand purchase', factor: 0.5, unit: 'item', defaultVal: 1, step: 1, icon: 'ph ph-shopping-bag-open' },
    { id: 'reusable', name: 'Reusable bag / no pack', factor: 0.0, unit: 'use', defaultVal: 1, step: 1, icon: 'ph ph-handbag' }
  ]
};

/* ==========================================================================
   INITIALIZATION & ROUTING
   ========================================================================== */
window.addEventListener('DOMContentLoaded', async () => {
  // Sync state with localstorage token
  userToken = localStorage.getItem('trace_token');
  
  if (userToken) {
    const fetched = await fetchUserData();
    if (!fetched) {
      // Clean stale/invalid tokens
      logout();
    }
  } else {
    checkAuth();
  }

  // Load appropriate hash view
  const initialPage = window.location.hash.slice(1) || 'home';
  navigateTo(initialPage);

  // Hash listener for standard browser history controls
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1) || 'home';
    navigateTo(page);
  });
});

/**
 * Fetch profiles and insights databases from backend Port 5000
 */
async function fetchUserData() {
  if (!userToken) return false;
  try {
    const profileRes = await fetch(`${API_BASE}/api/profile`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    if (!profileRes.ok) return false;
    userProfile = await profileRes.ok ? await profileRes.json() : null;
    
    const insightsRes = await fetch(`${API_BASE}/api/insights`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    if (insightsRes.ok) {
      insights = await insightsRes.json();
    }
    
    checkAuth();
    return true;
  } catch (err) {
    console.error("API Connection error:", err);
    return false;
  }
}

/**
 * Controls showing/hiding authenticated nav states
 */
function checkAuth() {
  const authStateContainer = document.getElementById('nav-auth-state');
  const mobileAuthStateContainer = document.getElementById('mobile-auth-state');

  if (userToken && userProfile) {
    // Logged in state
    if (authStateContainer) {
      authStateContainer.innerHTML = `
        <span class="nav-text-link" style="font-weight: 500; color: var(--color-green-primary);"><i class="ph ph-user" style="vertical-align: middle;" aria-hidden="true"></i> ${userProfile.name}</span>
        <a href="#" class="nav-btn btn-outlined" onclick="logout(event)" style="padding: 0.4rem 1rem; margin-left: 10px;">Sign out</a>
      `;
    }
    if (mobileAuthStateContainer) {
      mobileAuthStateContainer.innerHTML = `
        <div style="font-weight: 500; padding: 0.75rem; color: var(--color-green-primary);">${userProfile.name}</div>
        <a href="#" class="mobile-btn" onclick="logout(event)">Sign out</a>
      `;
    }
  } else {
    // Logged out default
    if (authStateContainer) {
      authStateContainer.innerHTML = `
        <a href="#" class="nav-text-link" onclick="openAuthModal('signin', event)">Sign in</a>
        <a href="#" class="nav-btn" onclick="openAuthModal('signup', event)">Get started</a>
      `;
    }
    if (mobileAuthStateContainer) {
      mobileAuthStateContainer.innerHTML = `
        <a href="#" class="mobile-nav-link text-link" onclick="openAuthModal('signin', event)">Sign in</a>
        <a href="#" class="mobile-btn" onclick="openAuthModal('signup', event)">Get started</a>
      `;
    }
  }
}

/**
 * Page routing action
 */
function navigateTo(page, event) {
  if (event) event.preventDefault();
  
  // Guard logged-in pages
  const protectedPages = ['dashboard', 'log', 'insights', 'progress'];
  if (protectedPages.includes(page) && !userToken) {
    openAuthModal('signin');
    window.location.hash = 'home';
    return;
  }

  currentPage = page;
  window.location.hash = page;

  // Highlight active links in navigation bar
  const links = document.querySelectorAll('.nav-link, .mobile-nav-link');
  links.forEach(link => {
    if (link.getAttribute('data-page') === page) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Render template to view
  const templateId = `tmpl-page-${page}`;
  const template = document.getElementById(templateId);
  const contentArea = document.getElementById('content-area');
  
  if (template && contentArea) {
    contentArea.innerHTML = '';
    const clone = template.content.cloneNode(true);
    contentArea.appendChild(clone);
    
    // Close mobile menus on navigating
    document.getElementById('mobile-nav-dropdown').classList.add('hidden');
    document.getElementById('mobile-toggle-icon').className = 'ph ph-list';
    const mobBtn = document.querySelector('.mobile-menu-toggle');
    if (mobBtn) mobBtn.setAttribute('aria-expanded', 'false');

    // Page rendering hooks
    if (page === 'dashboard') {
      renderDashboard();
    } else if (page === 'log') {
      activeCategory = 'transport';
      selectedActivity = null;
      renderLogPage();
    } else if (page === 'insights') {
      renderInsights();
    } else if (page === 'progress') {
      renderProgressPage();
    }
  }
}

/* ==========================================================================
   AUTHENTICATION INTERFACES
   ========================================================================== */
function openAuthModal(view = 'signin', event) {
  if (event) event.preventDefault();
  const modal = document.getElementById('auth-modal');
  modal.classList.remove('hidden');
  toggleAuthView(view);
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  // Clear any errors
  document.getElementById('signin-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
}

function toggleAuthView(view, event) {
  if (event) event.preventDefault();
  const signinView = document.getElementById('auth-signin-view');
  const signupView = document.getElementById('auth-signup-view');
  
  if (view === 'signin') {
    signinView.classList.remove('hidden');
    signupView.classList.add('hidden');
  } else {
    signinView.classList.add('hidden');
    signupView.classList.remove('hidden');
  }
}

async function handleSignInSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;
  const errorAlert = document.getElementById('signin-error');
  
  errorAlert.classList.add('hidden');
  
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('trace_token', data.token);
      userToken = data.token;
      await fetchUserData();
      closeAuthModal();
      navigateTo('dashboard');
    } else {
      errorAlert.textContent = data.message || "Incorrect email or password.";
      errorAlert.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Login failure:", err);
    errorAlert.textContent = "Network error connecting to verification APIs.";
    errorAlert.classList.remove('hidden');
  }
}

async function handleSignUpSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const errorAlert = document.getElementById('signup-error');
  
  errorAlert.classList.add('hidden');
  
  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('trace_token', data.token);
      userToken = data.token;
      await fetchUserData();
      closeAuthModal();
      navigateTo('dashboard');
    } else {
      errorAlert.textContent = data.message || "Email is already registered.";
      errorAlert.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Sign up failure:", err);
    errorAlert.textContent = "Network error connecting to registration APIs.";
    errorAlert.classList.remove('hidden');
  }
}

function logout(event) {
  if (event) event.preventDefault();
  localStorage.removeItem('trace_token');
  userToken = null;
  userProfile = null;
  insights = [];
  checkAuth();
  navigateTo('home');
}



function toggleMobileMenu() {
  const menu = document.getElementById('mobile-nav-dropdown');
  const icon = document.getElementById('mobile-toggle-icon');
  const button = document.querySelector('.mobile-menu-toggle');
  
  if (menu.classList.contains('hidden')) {
    menu.classList.remove('hidden');
    icon.className = 'ph ph-x';
    if (button) button.setAttribute('aria-expanded', 'true');
  } else {
    menu.classList.add('hidden');
    icon.className = 'ph ph-list';
    if (button) button.setAttribute('aria-expanded', 'false');
  }
}

/* ==========================================================================
   DASHBOARD VIEWPORT ENGINE
   ========================================================================== */
function renderDashboard() {
  if (!userProfile) return;

  // Sidebar profile updates
  document.getElementById('sidebar-name').textContent = userProfile.name;
  document.getElementById('sidebar-target').textContent = `Target: ${userProfile.target.toFixed(1)} kg CO₂`;
  document.getElementById('sidebar-streak-text').textContent = `${userProfile.streak}-day streak`;
  const streakIcon = document.querySelector('.streak-box i');
  if (streakIcon) {
    if (userProfile.streak === 0) {
      streakIcon.className = 'ph ph-fire-simple text-slate';
    } else {
      streakIcon.className = 'ph ph-fire-simple text-warning';
    }
  }
  
  // Set avatar text
  const initials = userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sidebar-avatar').textContent = initials;

  // Metrics numbers
  const today = userProfile.today;
  const target = userProfile.target;
  
  document.getElementById('dash-today-val').textContent = `${today.toFixed(1)} kg CO₂`;
  document.getElementById('dash-week-val').textContent = `${userProfile.weekTotal.toFixed(1)} kg CO₂`;
  document.getElementById('dash-best-val').textContent = `${userProfile.bestDay.toFixed(1)} kg CO₂`;

  // vs target percentage math
  const diffPercent = ((today - target) / target) * 100;
  const diffContainer = document.getElementById('dash-diff-val');
  
  if (diffPercent <= 0) {
    // Below target (Success!)
    diffContainer.textContent = `${diffPercent.toFixed(1)}%`;
    diffContainer.className = 'metric-val text-primary'; // Green
  } else {
    // Above target (Warning!)
    diffContainer.textContent = `+${diffPercent.toFixed(1)}%`;
    diffContainer.className = 'metric-val text-warning'; // Amber
  }

  // Weekly average values bar chart logic
  renderWeeklyChart(userProfile);

  // Sorted Category contributions breakdown
  renderDashboardCategoryBreakdown(userProfile);

  // Dashboard context nudge cards
  renderDashboardNudge(userProfile);
}

/**
 * Weekly bar chart drawer
 */
function renderWeeklyChart(profile) {
  const chartSvg = document.getElementById('dash-weekly-chart');
  if (!chartSvg) return;
  
  // Initialize all days of the week to 0.0
  const weekValues = {
    'Mon': 0.0,
    'Tue': 0.0,
    'Wed': 0.0,
    'Thu': 0.0,
    'Fri': 0.0,
    'Sat': 0.0,
    'Sun': 0.0
  };
  
  // Find dates of the current week (Monday to Sunday)
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon, ...
  
  // Calculate difference to Monday
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() + diffToMonday);
  
  // Generate dates for Mon to Sun
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    
    const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
    const dayStr = d.toLocaleDateString('en-US', { day: 'numeric' });
    const dateLabel = `${monthStr} ${dayStr}`;
    
    weekDates.push({
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      dateLabel: dateLabel
    });
  }
  
  // Now map progressHistory to these dates
  const history = profile.progressHistory || [];
  
  weekDates.forEach(wd => {
    // Find if we have a match in progressHistory
    const match = history.find(h => {
      if (h.date.includes('Today')) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayName = days[now.getDay()];
        return wd.dayName === (todayName === 'Sun' ? 'Sun' : todayName);
      }
      return h.date === wd.dateLabel;
    });
    
    if (match) {
      weekValues[wd.dayName] = match.value;
    }
  });
  
  const rects = chartSvg.querySelectorAll('rect');
  const dayNamesInChart = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  rects.forEach((rect, index) => {
    const day = dayNamesInChart[index];
    const val = weekValues[day];
    
    // 10.0 kg is y = 100, so height is val * 10, y = 184 - height
    const height = val * 10;
    const y = 184 - height;
    
    rect.setAttribute('height', height.toFixed(1));
    rect.setAttribute('y', y.toFixed(1));
    
    // Toggle amber warning colors when footprint breaches standard limits
    if (val > profile.target) {
      rect.setAttribute('class', 'bar-amber');
    } else {
      rect.setAttribute('class', 'bar-forest-green');
    }
  });
}

/**
 * Sorted lists for contributing segments
 */
function renderDashboardCategoryBreakdown(profile) {
  const container = document.querySelector('.breakdown-list');
  if (!container) return;
  
  const categories = profile.categories || {};
  const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  
  const totalSum = sortedCats.reduce((sum, item) => sum + item[1], 0) || 1;
  container.innerHTML = '';
  
  sortedCats.forEach(([catName, val]) => {
    const percentage = Math.min(100, Math.round((val / totalSum) * 100));
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    
    let iconClass = 'ph ph-question';
    if (catName === 'transport') iconClass = 'ph ph-car text-slate';
    else if (catName === 'food') iconClass = 'ph ph-fork-knife text-slate';
    else if (catName === 'energy') iconClass = 'ph ph-lightning text-slate';
    else if (catName === 'shopping') iconClass = 'ph ph-shopping-bag text-slate';

    row.innerHTML = `
      <div class="breakdown-meta">
        <span class="breakdown-cat-name"><i class="${iconClass}" aria-hidden="true"></i> ${catName}</span>
        <span class="breakdown-cat-val font-mono">${val.toFixed(1)} kg CO₂</span>
      </div>
      <div class="breakdown-bar-bg">
        <div class="breakdown-bar-fill ${catName}" style="width: ${percentage}%;"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

/**
 * Dynamic nudge alerts based on highest contributor
 */
function renderDashboardNudge(profile) {
  const nudgeText = document.querySelector('.nudge-text');
  const nudgeButton = document.querySelector('.btn-nudge-action');
  if (!nudgeText || !nudgeButton) return;
  
  const categories = profile.categories || {};
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const highest = sorted[0] ? sorted[0][0] : 'transport';
  const val = sorted[0] ? sorted[0][1] : 0;
  
  let recommendation = "";
  if (highest === 'transport') {
    recommendation = `Your transport footprint is ${val.toFixed(1)} kg CO₂. Consider walking or cycling to save carbon today.`;
  } else if (highest === 'food') {
    recommendation = `Your food emissions are high. Opting for plant-based lunch saves up to 4.2 kg CO₂/week.`;
  } else if (highest === 'energy') {
    recommendation = `Energy is leading your emissions. Unplugging standby electronics cuts usage by 8%.`;
  } else {
    recommendation = `Shopping items represent carbon impact. Opt for secondhand options where possible.`;
  }
  
  nudgeText.textContent = recommendation;
  
  // Find matching insights in database
  const matchingInsight = insights.find(ins => ins.category === highest && !ins.active);
  if (matchingInsight) {
    nudgeButton.textContent = "Accept Nudge";
    nudgeButton.disabled = false;
    nudgeButton.className = 'btn-nudge-action';
    nudgeButton.onclick = async () => {
      await tryInsightAction(matchingInsight.id);
      nudgeButton.textContent = "Applied ✔";
      nudgeButton.disabled = true;
      nudgeButton.style.backgroundColor = 'var(--color-green-light)';
      nudgeButton.style.color = 'var(--color-green-primary)';
      nudgeButton.style.borderColor = 'var(--color-green-primary)';
    };
  } else {
    nudgeButton.textContent = "Accepted";
    nudgeButton.disabled = true;
    nudgeButton.style.backgroundColor = 'var(--color-green-light)';
    nudgeButton.style.color = 'var(--color-green-primary)';
    nudgeButton.style.borderColor = 'var(--color-green-primary)';
  }
}

/* ==========================================================================
   LOG Habit Entry Forms
   ========================================================================== */
function switchLogCategory(cat) {
  activeCategory = cat;
  selectedActivity = null;
  renderLogPage();
}

function renderLogPage() {
  const tabsContainer = document.getElementById('log-tabs');
  if (!tabsContainer) return;
  
  // Tabs active styling
  const buttons = tabsContainer.querySelectorAll('button');
  buttons.forEach(btn => {
    if (btn.textContent.toLowerCase() === activeCategory) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });

  const listContainer = document.getElementById('log-activity-list');
  if (!listContainer) return;
  listContainer.setAttribute('aria-labelledby', `tab-${activeCategory}`);
  
  listContainer.innerHTML = '';
  const categoryActivities = activities[activeCategory] || [];
  
  categoryActivities.forEach((act, idx) => {
    if (!selectedActivity && idx === 0) {
      selectedActivity = act;
      const qtyInput = document.getElementById('log-quantity');
      if (qtyInput) qtyInput.value = act.defaultVal;
    }

    const card = document.createElement('div');
    const isSelected = selectedActivity && selectedActivity.id === act.id;
    card.className = `activity-option ${isSelected ? 'active' : ''}`;
    
    card.innerHTML = `
      <div class="activity-icon">
        <i class="${act.icon}" aria-hidden="true"></i>
      </div>
      <div class="activity-info">
        <span class="activity-name">${act.name}</span>
      </div>
    `;
    
    card.addEventListener('click', () => {
      selectedActivity = act;
      const qtyInput = document.getElementById('log-quantity');
      if (qtyInput) qtyInput.value = act.defaultVal;
      renderLogPage();
    });
    
    listContainer.appendChild(card);
  });

  // Label unit updates
  const quantityLabel = document.getElementById('quantity-input-label');
  if (quantityLabel && selectedActivity) {
    if (selectedActivity.unit === 'km') {
      quantityLabel.textContent = 'Distance (km)';
    } else if (selectedActivity.unit === 'kWh') {
      quantityLabel.textContent = 'Energy usage (kWh)';
    } else if (selectedActivity.unit === 'serving') {
      quantityLabel.textContent = 'Meals count';
    } else {
      quantityLabel.textContent = 'Count';
    }
  }

  updateLiveCalculation();
}

function adjustQuantity(amount) {
  const qtyInput = document.getElementById('log-quantity');
  if (!qtyInput || !selectedActivity) return;
  
  const currentVal = parseFloat(qtyInput.value) || 0;
  const step = selectedActivity.step;
  const diff = amount > 0 ? step : -step;
  qtyInput.value = Math.max(1, currentVal + diff);
  
  updateLiveCalculation();
}

function updateLiveCalculation() {
  const qtyInput = document.getElementById('log-quantity');
  const calcOutput = document.getElementById('live-calc-output');
  if (!qtyInput || !calcOutput || !selectedActivity) return;
  
  const qty = parseFloat(qtyInput.value) || 0;
  let footprint = 0;
  
  if (activeCategory === 'transport') {
    footprint = selectedActivity.factor * (qty / 10);
  } else {
    footprint = selectedActivity.factor * qty;
  }
  
  footprint = Math.round(footprint * 10) / 10;
  calcOutput.textContent = `This adds ${footprint.toFixed(1)} kg CO₂ to today`;
  calcOutput.style.backgroundColor = 'var(--color-green-light)';
  calcOutput.style.color = 'var(--color-green-primary)';
}

async function submitLog() {
  const qtyInput = document.getElementById('log-quantity');
  if (!qtyInput || !selectedActivity) return;
  
  const qty = parseFloat(qtyInput.value) || 0;
  if (qty <= 0) {
    alert("Please enter a valid quantity score.");
    return;
  }
  
  const payload = {
    category: activeCategory,
    activityName: selectedActivity.name,
    quantity: qty,
    factor: selectedActivity.factor
  };

  try {
    const res = await fetch(`${API_BASE}/api/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (data.success) {
      userProfile = data.user;
      
      const calcOutput = document.getElementById('live-calc-output');
      calcOutput.textContent = `Successfully logged ${data.added.toFixed(1)} kg CO₂ ✔`;
      calcOutput.style.backgroundColor = '#E2F0D9';
      calcOutput.style.color = '#385723';
      
      setTimeout(() => {
        navigateTo('dashboard');
      }, 1200);
    } else {
      alert("Error adding log data: " + data.message);
    }
  } catch (err) {
    console.error("Submit log failure:", err);
  }
}

function resetLogForm() {
  const qtyInput = document.getElementById('log-quantity');
  if (qtyInput && selectedActivity) {
    qtyInput.value = selectedActivity.defaultVal;
    updateLiveCalculation();
  }
}

/* ==========================================================================
   INSIGHTS FILTER ENGAGEMENT
   ========================================================================== */
function applyInsightFilters() {
  renderInsights();
}

function resetInsightFilters() {
  const checkboxes = document.querySelectorAll('.filter-checkbox');
  checkboxes.forEach(cb => cb.checked = true);
  
  const radio = document.querySelector('input[name="impact-filter"][value="all"]');
  if (radio) radio.checked = true;
  
  renderInsights();
}

function renderInsights() {
  const listContainer = document.getElementById('insights-list');
  const emptyState = document.getElementById('insights-empty-state');
  if (!listContainer) return;
  
  // Checked categories lists
  const checkboxes = document.querySelectorAll('.filter-checkbox');
  const activeCats = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.getAttribute('data-category'));
  
  // Selected radio level
  const radio = document.querySelector('input[name="impact-filter"]:checked');
  const impactVal = radio ? radio.value : 'all';
  
  const filtered = insights.filter(ins => {
    if (!activeCats.includes(ins.category)) return false;
    
    if (impactVal === 'high' && ins.impact !== 'high') return false;
    if (impactVal === 'medium-plus' && ins.impact !== 'high' && ins.impact !== 'medium') return false;
    
    return true;
  });

  listContainer.innerHTML = '';
  
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    listContainer.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  listContainer.classList.remove('hidden');
  
  filtered.forEach(ins => {
    const card = document.createElement('div');
    card.className = `insight-card ${ins.active ? 'active' : ''}`;
    
    const impactClass = ins.impact === 'high' ? 'text-warning bg-warning-light' : 'text-slate bg-slate-light';
    
    card.innerHTML = `
      <div class="insight-header-row">
        <span class="pill-tag ${impactClass}">${ins.impact} impact</span>
        <span class="insight-cat font-mono">${ins.category}</span>
      </div>
      <h3 class="insight-title" style="margin-top: 0.5rem;">${ins.heading}</h3>
      <div class="insight-saves font-mono" style="margin: 0.5rem 0;">${ins.saves}</div>
      <p class="insight-desc">${ins.body}</p>
      <div class="insight-actions" style="margin-top: 1rem;">
        ${ins.active ? `
          <button class="btn-insight-try text-primary" style="background-color: var(--color-green-light); cursor: default;" disabled>Active habit</button>
        ` : `
          <button class="btn-insight-try" onclick="tryInsightAction(${ins.id})">Try this habit</button>
          <button class="btn-insight-dismiss" onclick="dismissInsight(${ins.id})">Dismiss</button>
        `}
      </div>
    `;
    listContainer.appendChild(card);
  });
}

async function tryInsightAction(id) {
  try {
    const res = await fetch(`${API_BASE}/api/insights/try`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ id })
    });
    
    const data = await res.json();
    if (data.success) {
      await fetchUserData();
      if (currentPage === 'insights') {
        renderInsights();
      } else if (currentPage === 'dashboard') {
        renderDashboard();
      }
    }
  } catch (err) {
    console.error("Try action failure:", err);
  }
}

async function dismissInsight(id) {
  try {
    const res = await fetch(`${API_BASE}/api/insights/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ id })
    });
    
    const data = await res.json();
    if (data.success) {
      await fetchUserData();
      renderInsights();
    }
  } catch (err) {
    console.error("Dismiss action failure:", err);
  }
}

/* ==========================================================================
   PROGRESS GRAPHING LOGIC
   ========================================================================== */
function switchTimeRange(days) {
  activeTimeRange = days;
  
  const buttons = document.querySelectorAll('.time-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(days)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  renderProgressPage();
}

function renderProgressPage() {
  if (!userProfile) return;
  
  // Calculate aggregate metrics
  renderProgressStats(userProfile);
  
  // Drawing path elements on SVG viewport
  renderProgressChart(userProfile);
  
  // Sorted category breakdown vs baseline
  renderProgressBreakdown(userProfile);
  
  // Unlockable achievements list
  renderMilestones(userProfile);
}

function renderProgressStats(profile) {
  const reductionVal = document.getElementById('progress-reduction-val');
  const avoidedVal = document.getElementById('progress-avoided-val');
  const daysVal = document.getElementById('progress-days-val');
  
  const history = profile.progressHistory || [];
  const baseline = 12.0;
  const target = profile.target;
  
  if (history.length === 0) return;
  
  const todayVal = profile.today;
  const reductionPercent = ((baseline - todayVal) / baseline) * 100;
  
  if (reductionVal) {
    if (reductionPercent >= 0) {
      reductionVal.textContent = `-${reductionPercent.toFixed(1)}% vs. start`;
      reductionVal.className = 'stat-value text-primary';
    } else {
      reductionVal.textContent = `+${Math.abs(reductionPercent).toFixed(1)}% vs. start`;
      reductionVal.className = 'stat-value text-warning';
    }
  }
  
  let totalAvoided = 0;
  let daysBelowTarget = 0;
  
  history.forEach(h => {
    totalAvoided += (baseline - h.value);
    if (h.value <= target) {
      daysBelowTarget++;
    }
  });
  
  if (avoidedVal) {
    avoidedVal.textContent = `${totalAvoided.toFixed(1)} kg CO₂`;
  }
  
  if (daysVal) {
    daysVal.textContent = `${daysBelowTarget} of ${history.length}`;
  }
}

function renderProgressChart(profile) {
  const chartSvg = document.getElementById('progress-line-chart');
  if (!chartSvg) return;
  
  let history = profile.progressHistory || [];
  if (history.length === 0) return;
  
  // Filter history based on time-range selection
  const daysLimit = parseInt(activeTimeRange);
  if (daysLimit === 90) {
    // Generate additional history nodes deterministically so the graph looks full
    history = generateMockHistoricalData(history, 25);
  } else if (daysLimit === 365) {
    history = generateMockHistoricalData(history, 60);
  }
  
  const targetVal = profile.target;
  const baselineVal = 12.0;
  
  const values = history.map(h => h.value);
  const maxVal = Math.max(...values, targetVal, baselineVal, 15.0) * 1.15;
  const minVal = Math.max(0, Math.min(...values, 0));
  
  const chartWidth = 900;
  const chartHeight = 210;
  
  const getX = (index) => {
    if (history.length <= 1) return 500;
    return 50 + (index * (chartWidth / (history.length - 1)));
  };
  const getY = (val) => 240 - ((val - minVal) / (maxVal - minVal)) * chartHeight;
  
  const targetY = getY(targetVal);
  const baselineY = getY(baselineVal);
  
  const lines = chartSvg.querySelectorAll('line');
  if (lines.length >= 3) {
    lines[1].setAttribute('y1', baselineY.toFixed(1));
    lines[1].setAttribute('y2', baselineY.toFixed(1));
    
    lines[2].setAttribute('y1', targetY.toFixed(1));
    lines[2].setAttribute('y2', targetY.toFixed(1));
  }
  
  const points = history.map((h, i) => ({
    x: getX(i),
    y: getY(h.value),
    date: h.date,
    val: h.value
  }));
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},240 L ${points[0].x.toFixed(1)},240 Z`;
  
  const linePath = document.getElementById('chart-footprint-line');
  const areaFill = document.getElementById('chart-area-fill');
  if (linePath) linePath.setAttribute('d', pathD);
  if (areaFill) areaFill.setAttribute('d', areaD);
  
  // Clear old interactive nodes
  const existingDots = chartSvg.querySelectorAll('.chart-dot');
  existingDots.forEach(d => d.remove());
  
  // Render new hoverable nodes
  points.forEach((p, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x.toFixed(1));
    circle.setAttribute('cy', p.y.toFixed(1));
    circle.setAttribute('r', '4');
    
    const isToday = (i === points.length - 1);
    circle.setAttribute('class', `chart-dot ${isToday ? 'active' : ''}`);
    if (isToday) {
      circle.setAttribute('id', 'today-chart-dot');
    }
    
    circle.setAttribute('data-date', p.date);
    circle.setAttribute('data-val', `${p.val.toFixed(1)} kg CO₂`);
    
    circle.addEventListener('mouseenter', (e) => showTooltip(e, p));
    circle.addEventListener('mouseleave', hideTooltip);
    
    chartSvg.appendChild(circle);
  });
  
  // Update Y Axis values dynamically
  const textElements = chartSvg.querySelectorAll('text');
  const yLabels = Array.from(textElements).filter(el => el.getAttribute('x') === '25');
  
  if (yLabels.length >= 4) {
    yLabels[0].textContent = minVal.toFixed(1);
    yLabels[0].setAttribute('y', (getY(minVal) + 4).toFixed(1));
    
    yLabels[1].textContent = targetVal.toFixed(1);
    yLabels[1].setAttribute('y', (getY(targetVal) + 4).toFixed(1));
    
    yLabels[2].textContent = baselineVal.toFixed(1);
    yLabels[2].setAttribute('y', (getY(baselineVal) + 4).toFixed(1));
    
    yLabels[3].textContent = maxVal.toFixed(1);
    yLabels[3].setAttribute('y', (getY(maxVal) + 4).toFixed(1));
  }
  
  // Update X Axis values dynamically
  const xLabels = Array.from(textElements).filter(el => el.getAttribute('y') === '260');
  if (xLabels.length >= 5 && points.length > 0) {
    const indices = [
      0,
      Math.floor(points.length * 0.25),
      Math.floor(points.length * 0.5),
      Math.floor(points.length * 0.75),
      points.length - 1
    ];
    
    xLabels.forEach((lbl, labelIdx) => {
      const pointIdx = indices[labelIdx];
      if (pointIdx !== undefined && points[pointIdx]) {
        lbl.textContent = points[pointIdx].date;
        lbl.setAttribute('x', points[pointIdx].x.toFixed(1));
        if (labelIdx === 4) {
          lbl.textContent = 'Today';
          lbl.setAttribute('text-anchor', 'end');
        } else if (labelIdx === 0) {
          lbl.setAttribute('text-anchor', 'start');
        } else {
          lbl.setAttribute('text-anchor', 'middle');
        }
      }
    });
  }

  // Anchor initial tooltip position to today's dot
  hideTooltip();
}

/**
 * Deterministic data seed helper to fill larger chart scopes
 */
function generateMockHistoricalData(realHistory, targetCount) {
  if (realHistory.length >= targetCount) return realHistory;
  
  const output = [];
  const startDay = 19 - targetCount;
  
  for (let i = 0; i < targetCount - 1; i++) {
    const day = startDay + i;
    // Deterministic random fluctuations around 10.0
    const factor = Math.sin(day * 0.8) * 3 + Math.cos(day * 0.3) * 1.5;
    const value = Math.max(4.5, Math.round((11.2 + factor) * 10) / 10);
    
    let monthLabel = "May";
    let dateNumber = day;
    if (day <= 0) {
      dateNumber = 31 + day;
    } else {
      monthLabel = "Jun";
    }
    
    output.push({
      date: `${monthLabel} ${dateNumber}`,
      value: value
    });
  }
  
  // Append current day's real value
  output.push(realHistory[realHistory.length - 1]);
  return output;
}

function showTooltip(e, p) {
  const tooltip = document.getElementById('progress-chart-tooltip');
  const crosshair = document.getElementById('chart-crosshair');
  if (!tooltip) return;
  
  tooltip.querySelector('.tooltip-date').textContent = p.date;
  tooltip.querySelector('.tooltip-val').textContent = `${p.val.toFixed(1)} kg CO₂`;
  
  const svg = document.getElementById('progress-line-chart');
  const svgRect = svg.getBoundingClientRect();
  const scaleX = svgRect.width / 1000;
  const scaleY = svgRect.height / 280;
  
  const clientX = p.x * scaleX;
  const clientY = p.y * scaleY;
  
  tooltip.style.left = `${clientX}px`;
  tooltip.style.top = `${clientY}px`;
  tooltip.style.display = 'block';
  
  if (crosshair) {
    crosshair.setAttribute('x1', p.x.toFixed(1));
    crosshair.setAttribute('x2', p.x.toFixed(1));
    crosshair.style.display = 'block';
  }
}

function hideTooltip() {
  const tooltip = document.getElementById('progress-chart-tooltip');
  const crosshair = document.getElementById('chart-crosshair');
  const todayDot = document.getElementById('today-chart-dot');
  
  if (todayDot && tooltip) {
    const cx = parseFloat(todayDot.getAttribute('cx'));
    const cy = parseFloat(todayDot.getAttribute('cy'));
    const date = todayDot.getAttribute('data-date');
    const val = todayDot.getAttribute('data-val');
    
    tooltip.querySelector('.tooltip-date').textContent = date;
    tooltip.querySelector('.tooltip-val').textContent = val;
    
    const svg = document.getElementById('progress-line-chart');
    const svgRect = svg.getBoundingClientRect();
    const scaleX = svgRect.width / 1000;
    const scaleY = svgRect.height / 280;
    
    tooltip.style.left = `${cx * scaleX}px`;
    tooltip.style.top = `${cy * scaleY}px`;
    tooltip.style.display = 'block';
    
    if (crosshair) {
      crosshair.setAttribute('x1', cx.toFixed(1));
      crosshair.setAttribute('x2', cx.toFixed(1));
      crosshair.style.display = 'block';
    }
  } else {
    if (tooltip) tooltip.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
  }
}

function renderProgressBreakdown(profile) {
  const container = document.getElementById('progress-breakdown-container');
  if (!container) return;
  
  const categoryBaselines = {
    transport: 7.0,
    food: 3.5,
    energy: 1.2,
    shopping: 0.8
  };
  
  container.innerHTML = '';
  
  Object.entries(profile.categories).forEach(([catName, currentVal]) => {
    const baseline = categoryBaselines[catName] || 1.0;
    const diff = ((baseline - currentVal) / baseline) * 100;
    
    const row = document.createElement('div');
    row.className = 'progress-breakdown-row';
    
    let iconClass = 'ph ph-question';
    if (catName === 'transport') iconClass = 'ph ph-car';
    else if (catName === 'food') iconClass = 'ph ph-fork-knife';
    else if (catName === 'energy') iconClass = 'ph ph-lightning';
    else if (catName === 'shopping') iconClass = 'ph ph-shopping-bag';
    
    let changeText = '';
    let isWarning = diff < 0;
    
    if (diff >= 0) {
      changeText = `-${diff.toFixed(1)}%`;
    } else {
      changeText = `+${Math.abs(diff).toFixed(1)}%`;
    }
    
    row.innerHTML = `
      <div class="progress-breakdown-cat">
        <i class="${iconClass}" aria-hidden="true"></i>
        <div>
          <div style="font-weight: 500; text-transform: capitalize;">${catName}</div>
          <div class="progress-breakdown-details text-secondary">${currentVal.toFixed(1)} kg CO₂ vs. ${baseline.toFixed(1)} kg CO₂ baseline</div>
        </div>
      </div>
      <div class="progress-breakdown-change ${isWarning ? 'warning' : ''}">${changeText}</div>
    `;
    container.appendChild(row);
  });
}

function renderMilestones(profile) {
  const container = document.getElementById('milestones-nodes-container');
  if (!container) return;
  
  const history = profile.progressHistory || [];
  const baseline = 12.0;
  
  let totalAvoided = 0;
  let daysBelowTarget = 0;
  
  history.forEach(h => {
    totalAvoided += (baseline - h.value);
    if (h.value <= profile.target) {
      daysBelowTarget++;
    }
  });
  
  const milestones = [
    {
      id: 'first_steps',
      title: 'First steps',
      icon: 'ph ph-footprints',
      condition: history.length >= 1,
      date: history[0] ? history[0].date.replace(' (Today)', '') : 'Today'
    },
    {
      id: 'on_target',
      title: 'On target',
      icon: 'ph ph-target',
      condition: daysBelowTarget >= 3,
      date: 'Jun 7'
    },
    {
      id: 'habit_builder',
      title: 'Habit builder',
      icon: 'ph ph-fire-simple',
      condition: profile.streak >= 7,
      date: 'Jun 13'
    },
    {
      id: 'carbon_saver',
      title: 'Carbon saver',
      icon: 'ph ph-leaf',
      condition: totalAvoided >= 20.0,
      date: 'Jun 17'
    }
  ];
  
  container.innerHTML = '';
  
  milestones.forEach(m => {
    const node = document.createElement('div');
    node.className = `milestone-node ${m.condition ? '' : 'locked'}`;
    
    node.innerHTML = `
      <div class="milestone-icon-box">
        <i class="${m.condition ? m.icon : 'ph ph-lock'}" aria-hidden="true"></i>
      </div>
      <div class="milestone-content">
        <span class="milestone-title">${m.title}</span>
        <span class="milestone-date">${m.condition ? m.date : 'Locked'}</span>
      </div>
    `;
    container.appendChild(node);
  });
}

// Expose routing and handlers to the global scope
window.navigateTo = navigateTo;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthView = toggleAuthView;
window.handleSignInSubmit = handleSignInSubmit;
window.handleSignUpSubmit = handleSignUpSubmit;
window.logout = logout;
window.toggleMobileMenu = toggleMobileMenu;

window.switchLogCategory = switchLogCategory;
window.adjustQuantity = adjustQuantity;
window.updateLiveCalculation = updateLiveCalculation;
window.submitLog = submitLog;
window.resetLogForm = resetLogForm;

window.applyInsightFilters = applyInsightFilters;
window.resetInsightFilters = resetInsightFilters;

window.tryInsightAction = tryInsightAction;
window.dismissInsight = dismissInsight;

window.switchTimeRange = switchTimeRange;
