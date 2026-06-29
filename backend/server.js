// Food Wastage Management System - backend (server.js)
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files from ../public
app.use(express.static(path.join(__dirname, '..', 'public')));

// MySQL connection pool (better for serverless environments like Vercel)
const db = mysql.createPool({
  connectionLimit: 5,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Omkar@2005',
  database: process.env.DB_NAME || 'food_waste_proj',
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

db.on('connection', () => {
  console.log('MySQL Pool: New connection established');
});

db.on('error', (err) => {
  console.error('MySQL Pool error:', err);
});

// Ensure `history` table exists and backfill from accepted food entries
let historyTableEnsured = false;
function ensureHistoryTable(callback) {
  if (historyTableEnsured) return callback && callback();
  
  const create = `CREATE TABLE IF NOT EXISTS history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_id INT,
    hotel_id INT,
    ngo_id INT,
    quantity VARCHAR(255),
    location VARCHAR(255),
    food_name VARCHAR(255),
    distributed_at DATETIME
  )`;

  db.query(create, (err) => {
    if (err) {
      console.warn('Failed to ensure history table', err);
      return callback && callback();
    }
    const backfill = `INSERT INTO history (food_id, hotel_id, ngo_id, quantity, location, food_name, distributed_at)
      SELECT f.food_id, f.hotel_id, NULL, f.quantity, f.location, f.food_name, NOW()
      FROM food f
      LEFT JOIN history h ON h.food_id = f.food_id
      WHERE f.status='Accepted' AND h.id IS NULL`;
    db.query(backfill, (err2) => {
      if (err2) console.warn('Backfill failed', err2);
      else console.log('History table ensured and backfilled');
      historyTableEnsured = true;
      callback && callback();
    });
  });
}

// REGISTER
app.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ success: false, message: 'Missing required fields' });

  db.query('SELECT id FROM userslogin WHERE email=?', [email], (err, rows) => {
    if (err) {
      console.error('Register select error:', err);
      return res.status(500).json({ success: false, message: 'DB error' });
    }
    if (rows && rows.length > 0) return res.status(409).json({ success: false, message: 'Email already exists' });

    const sql = 'INSERT INTO userslogin(name,email,password,role) VALUES(?,?,?,?)';
    db.query(sql, [name, email, password, role], (err2, result) => {
      if (err2) {
        console.error('Register insert error:', err2);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      res.json({ success: true, message: 'Registration successful', userId: result.insertId });
    });
  });
});

// LOGIN
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Missing email or password' });

  const sql = 'SELECT * FROM userslogin WHERE email=? AND password=?';
  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error('Login query error:', err);
      return res.status(500).json({ success: false, message: 'DB error' });
    }
    if (result && result.length > 0) {
      const user = Object.assign({}, result[0]);
      if (user.password) delete user.password;
      return res.json({ success: true, user });
    }
    res.status(401).json({ success: false, message: 'Invalid email or password' });
  });
});

// ADD FOOD (HOTEL)
app.post('/food/add', (req, res) => {
  const { hotel_id, foodName, quantity, location, expiry } = req.body;
  const sql = `INSERT INTO food (hotel_id,food_name,quantity,location,expiry,status) VALUES(?,?,?,?,?,'Available')`;
  db.query(sql, [hotel_id, foodName, quantity, location, expiry], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, message: 'Food Added' });
  });
});

// SHOW ALL FOOD
app.get('/food', (req, res) => {
  db.query('SELECT * FROM food', (err, result) => {
    if (err) return res.json([]);
    res.json(result);
  });
});

// NGO AVAILABLE FOOD
app.get('/food/available', (req, res) => {
  db.query("SELECT * FROM food WHERE status='Available'", (err, result) => {
    if (err) return res.json([]);
    res.json(result);
  });
});

// NGO ACCEPT FOOD (updates status)
app.post('/donation/accept', (req, res) => {
  const { food_id, ngo_id } = req.body;
  db.query("UPDATE food SET status='Accepted' WHERE food_id=?", [food_id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, message: 'Donation Accepted' });
  });
});

// Record history: when donation accepted, insert into `history` table
app.post('/donation/accept-record', (req, res) => {
  const { food_id, ngo_id } = req.body;
  db.query('SELECT * FROM food WHERE food_id=?', [food_id], (err, foodRes) => {
    if (err || !foodRes || foodRes.length === 0) return res.json({ success: false });
    const food = foodRes[0];
    const insert = `INSERT INTO history (food_id, hotel_id, ngo_id, quantity, location, food_name, distributed_at) VALUES (?,?,?,?,?,?,NOW())`;
    db.query(insert, [food_id, food.hotel_id, ngo_id, food.quantity, food.location, food.food_name], (err2) => {
      if (err2) return res.json({ success: false });
      res.json({ success: true, message: 'Recorded' });
    });
  });
});

// GET users
app.get('/users', (req, res) => {
  db.query('SELECT * FROM userslogin', (err, result) => {
    if (err) return res.json([]);
    res.json(result);
  });
});

// DELETE user
app.delete('/users/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM userslogin WHERE id=?', [id], (err) => {
    if (err) return res.json({ success: false, message: 'Delete failed' });
    res.json({ success: true, message: 'User removed' });
  });
});

// GET history
app.get('/history', (req, res) => {
  ensureHistoryTable(() => {
    const sql = `SELECT h.*, u.name as ngo_name, f.food_name, f.location, f.quantity, h.distributed_at FROM history h LEFT JOIN userslogin u ON h.ngo_id=u.id LEFT JOIN food f ON h.food_id=f.food_id ORDER BY h.distributed_at DESC`;
    db.query(sql, (err, result) => {
      if (err) {
        console.error('History query error:', err);
        return res.json([]);
      }
      res.json(result);
    });
  });
});

// SERVER START
const PORT = process.env.PORT || 5000;

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
