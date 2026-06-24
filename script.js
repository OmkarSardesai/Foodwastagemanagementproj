// Client-side script for login and basic navigation
// Determine API base dynamically:
// - If running on `localhost` use local backend `http://localhost:5000`
// - If `window.API_BASE_OVERRIDE` is set (e.g. injected in HTML), use that
// - Otherwise use the current page origin (works when backend serves the frontend)
const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = _isLocal
  ? 'http://localhost:5000'
  : (window.API_BASE_OVERRIDE || window.location.origin);
async function loginUser() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }

  try {
    const res = await fetch(BASE_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success && data.user) {
      // store user info locally for subsequent pages
      localStorage.setItem('user', JSON.stringify(data.user));

      const role = (data.user.role || '').toLowerCase();

      if (role === 'hotel') {
        window.location.href = 'hoteldashboard.html';
      } else if (role === 'ngo') {
        window.location.href = 'ngodashboard.html';
      } else {
        window.location.href = 'userdashboard.html';
      }
    } else {
      alert(data.message || 'Invalid email or password');
    }

  } catch (err) {
    console.error('Login error:', err);
    alert('Unable to contact server. Make sure the backend is running.');
  }
}

// Optional: expose for debugging in console
window.loginUser = loginUser;

async function registerUser() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const role = document.getElementById('role').value;

  if (!name || !email || !password) {
    alert('Please fill all fields');
    return;
  }

  try {
    const res = await fetch(BASE_URL + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message || 'Registration successful');
      window.location.href = 'login.html';
    } else {
      alert(data.message || 'Registration failed');
    }

  } catch (err) {
    console.error('Register error:', err);
    alert('Unable to contact server. Make sure the backend is running.');
  }
}

window.registerUser = registerUser;

function logout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

window.logout = logout;

function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.id || user.user_id || user.ID || user.uid || user.userId || null;
}

async function addFood() {
  const foodName = document.getElementById('foodName').value.trim();
  const quantity = document.getElementById('quantity').value.trim();
  const location = document.getElementById('location').value.trim();
  const expiry = document.getElementById('expiry').value;

  if (!foodName || !quantity || !location || !expiry) {
    alert('Please fill all fields');
    return;
  }

  const hotel_id = getCurrentUserId();
  if (!hotel_id) {
    alert('Hotel not identified. Please login again.');
    return;
  }

  try {
    const res = await fetch(BASE_URL + '/food/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotel_id, foodName, quantity, location, expiry })
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message || 'Food added');
      loadHotelFood();
    } else {
      alert(data.message || 'Failed to add food');
    }
  } catch (err) {
    console.error('Add food error:', err);
    alert('Unable to contact server.');
  }
}

window.addFood = addFood;

function makeFoodCard(item, includeAccept = false) {
  const div = document.createElement('div');
  div.className = 'food-card';
  div.innerHTML = `
    <h3>${item.food_name || item.foodName || ''}</h3>
    <p>Quantity: ${item.quantity || ''}</p>
    <p>Location: ${item.location || ''}</p>
    <p>Expiry: ${item.expiry || ''}</p>
  `;

  if (includeAccept) {
    const btn = document.createElement('button');
    btn.textContent = 'Accept';
    btn.onclick = () => acceptDonation(item.food_id || item.id || item.foodId);
    div.appendChild(btn);
  }

  return div;
}

async function loadHotelFood() {
  const userId = getCurrentUserId();
  if (!userId) return logout();

  try {
    const res = await fetch(BASE_URL + '/food');
    const list = await res.json();
    const container = document.getElementById('foodList');
    container.innerHTML = '';
    const mine = list.filter(i => (i.hotel_id == userId) || (i.hotel_id == Number(userId)));
    if (mine.length === 0) container.textContent = 'No donations yet.';
    mine.forEach(item => container.appendChild(makeFoodCard(item, false)));
  } catch (err) {
    console.error('Load hotel food error:', err);
  }
}

window.loadHotelFood = loadHotelFood;

async function loadNgoFood() {
  const userId = getCurrentUserId();
  if (!userId) return logout();

  try {
    const res = await fetch(BASE_URL + '/food/available');
    const list = await res.json();
    const container = document.getElementById('ngoFood');
    container.innerHTML = '';
    if (!list || list.length === 0) {
      container.textContent = 'No available food.';
      return;
    }
    list.forEach(item => container.appendChild(makeFoodCard(item, true)));
  } catch (err) {
    console.error('Load NGO food error:', err);
  }
}

window.loadNgoFood = loadNgoFood;

async function loadUserFood() {
  try {
    const res = await fetch(BASE_URL + '/food/available');
    const list = await res.json();
    const container = document.getElementById('userFood');
    container.innerHTML = '';
    if (!list || list.length === 0) {
      container.textContent = 'No available food.';
      return;
    }
    list.forEach(item => container.appendChild(makeFoodCard(item, false)));
  } catch (err) {
    console.error('Load user food error:', err);
  }
  
}

window.loadUserFood = loadUserFood;

// --- Manage UI functions ---
function toggleManage() {
  const p = document.getElementById('managePanel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function hideManage() {
  const p = document.getElementById('managePanel');
  if (!p) return;
  p.style.display = 'none';
}

async function loadUsersByRole(role) {
  try {
    const res = await fetch(BASE_URL + '/users');
    const list = await res.json();
    const container = document.getElementById('manageList');
    container.innerHTML = '';
    const filtered = (list || []).filter(u => (u.role || '').toLowerCase() === (role || '').toLowerCase());
    if (filtered.length === 0) {
      container.textContent = 'No records found.';
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.border = '1';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    filtered.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.id || u.user_id || u.ID || ''}</td>
                      <td>${u.name || ''}</td>
                      <td>${u.email || ''}</td>
                      <td>${u.role || ''}</td>`;
      const td = document.createElement('td');
      const del = document.createElement('button');
      del.textContent = 'Remove';
      del.onclick = () => removeUser(u.id || u.user_id);
      td.appendChild(del);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

  } catch (err) {
    console.error('Load users error:', err);
  }
}

async function removeUser(id) {
  if (!confirm('Remove this user?')) return;
  try {
    const res = await fetch(`${BASE_URL}/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      alert(data.message || 'Removed');
      // refresh list
      const role = document.querySelector('#manageList table tbody tr td:nth-child(4)')?.textContent || '';
      loadUsersByRole(role);
    } else {
      alert(data.message || 'Failed to remove');
    }
  } catch (err) {
    console.error('Remove user error:', err);
  }
}

async function loadHistory() {
  try {
    const res = await fetch(BASE_URL + '/history');
    const list = await res.json();
    const container = document.getElementById('historyTableContainer');
    container.innerHTML = '';
    if (!list || list.length === 0) {
      container.textContent = 'No history available.';
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.border = '1';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>When</th><th>Where</th><th>Food</th><th>Quantity</th><th>ReceivedBy(NGO)</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    list.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.distributed_at || r.when || ''}</td>
                      <td>${r.location || ''}</td>
                      <td>${r.food_name || r.foodName || ''}</td>
                      <td>${r.quantity || ''}</td>
                      <td>${r.ngo_name || r.received_by || ''}</td>`;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

  } catch (err) {
    console.error('Load history error:', err);
  }
}

window.toggleManage = toggleManage;
window.hideManage = hideManage;
window.loadUsersByRole = loadUsersByRole;
window.loadHistory = loadHistory;

async function acceptDonation(food_id) {
  const ngo_id = getCurrentUserId();
  if (!ngo_id) return logout();

  try {
    const res = await fetch(BASE_URL + '/donation/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_id, ngo_id })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message || 'Donation accepted');
      // record history
      try {
        await fetch(BASE_URL + '/donation/accept-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ food_id, ngo_id })
        });
      } catch (e) {
        console.warn('Failed to record history', e);
      }
      loadNgoFood();
    } else {
      alert(data.message || 'Failed to accept');
    }
  } catch (err) {
    console.error('Accept donation error:', err);
  }
}

window.acceptDonation = acceptDonation;

// Auto-run appropriate loaders when dashboard pages load
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();
  if (path === 'hoteldashboard.html') loadHotelFood();
  if (path === 'ngodashboard.html') loadNgoFood();
  if (path === 'userdashboard.html') loadUserFood();
});
