const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'perbot.db');

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS facilitators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'facilitator',
      must_change_password INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      facilitator_id TEXT,
      arc TEXT DEFAULT '',
      archived INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facilitator_id) REFERENCES facilitators(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      facilitator_id TEXT,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      client_summary TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS practices (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT DEFAULT '',
      filename TEXT DEFAULT '',
      is_favourite INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  save();
  return db;
}

function save() {
  if (!db) return;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function getDbSync() {
  if (!db) throw new Error('DB not initialised');
  return db;
}

function rowsToObjects(result) {
  return result.values.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function queryOne(sql, params = []) {
  const result = getDbSync().exec(sql, params);
  if (!result.length || !result[0].values.length) return null;
  return rowsToObjects(result[0])[0];
}

function queryAll(sql, params = []) {
  const result = getDbSync().exec(sql, params);
  if (!result.length) return [];
  return rowsToObjects(result[0]);
}

// ── Facilitators ──
function createFacilitator(id, name, email, passwordHash, role = 'facilitator') {
  getDbSync().run(
    'INSERT INTO facilitators (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [id, name, email.toLowerCase(), passwordHash, role]
  );
  save();
}

function getFacilitatorByEmail(email) {
  return queryOne('SELECT * FROM facilitators WHERE email = ?', [email.toLowerCase()]);
}

function getFacilitatorById(id) {
  return queryOne('SELECT * FROM facilitators WHERE id = ?', [id]);
}

function getAllFacilitators() {
  return queryAll('SELECT id, name, email, role, created_at FROM facilitators WHERE role != ? ORDER BY name ASC', ['admin']);
}

function updateFacilitatorPassword(id, passwordHash) {
  getDbSync().run('UPDATE facilitators SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, id]);
  save();
}

function deleteFacilitator(id) {
  getDbSync().run('DELETE FROM facilitators WHERE id = ?', [id]);
  save();
}

function facilitatorCount() {
  const result = getDbSync().exec('SELECT COUNT(*) as count FROM facilitators WHERE role != "admin"');
  return result[0]?.values[0][0] || 0;
}

// ── Clients ──
function createClient(id, name, facilitatorId, email = null, passwordHash = null) {
  getDbSync().run(
    'INSERT INTO clients (id, name, facilitator_id, email, password_hash) VALUES (?, ?, ?, ?, ?)',
    [id, name, facilitatorId, email, passwordHash]
  );
  save();
}

function getClient(id) {
  return queryOne('SELECT * FROM clients WHERE id = ?', [id]);
}

function getClientByEmail(email) {
  if (!email) return null;
  return queryOne('SELECT * FROM clients WHERE email = ?', [email.toLowerCase()]);
}

function getAllClients(facilitatorId, includeArchived = false) {
  const sql = includeArchived
    ? 'SELECT * FROM clients WHERE facilitator_id = ? ORDER BY name ASC'
    : 'SELECT * FROM clients WHERE facilitator_id = ? AND archived = 0 ORDER BY name ASC';
  return queryAll(sql, [facilitatorId]);
}

function getAllClientsAdmin(includeArchived = false) {
  const sql = includeArchived
    ? 'SELECT c.*, f.name as facilitator_name FROM clients c LEFT JOIN facilitators f ON c.facilitator_id = f.id ORDER BY c.name ASC'
    : 'SELECT c.*, f.name as facilitator_name FROM clients c LEFT JOIN facilitators f ON c.facilitator_id = f.id WHERE c.archived = 0 ORDER BY c.name ASC';
  return queryAll(sql, []);
}

function updateArc(clientId, arc) {
  getDbSync().run('UPDATE clients SET arc = ? WHERE id = ?', [arc, clientId]);
  save();
}

function archiveClient(clientId) {
  getDbSync().run('UPDATE clients SET archived = 1 - archived WHERE id = ?', [clientId]);
  save();
}

function updateClientPassword(id, passwordHash) {
  getDbSync().run('UPDATE clients SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, id]);
  save();
}

function updateClientEmail(id, email) {
  getDbSync().run('UPDATE clients SET email = ? WHERE id = ?', [email.toLowerCase(), id]);
  save();
}

// ── Sessions ──
function addSession(id, clientId, facilitatorId, type, summary, clientSummary = '') {
  getDbSync().run(
    'INSERT INTO sessions (id, client_id, facilitator_id, type, summary, client_summary) VALUES (?, ?, ?, ?, ?, ?)',
    [id, clientId, facilitatorId, type, summary, clientSummary]
  );
  save();
}

function getSessionsForClient(clientId) {
  return queryAll('SELECT * FROM sessions WHERE client_id = ? ORDER BY created_at DESC', [clientId]);
}

function getClientSessionsForClient(clientId) {
  return queryAll('SELECT id, type, client_summary, created_at FROM sessions WHERE client_id = ? AND client_summary != "" ORDER BY created_at DESC', [clientId]);
}

// ── Practices ──
function addPractice(id, clientId, title, type, content, filename) {
  getDbSync().run(
    'INSERT INTO practices (id, client_id, title, type, content, filename) VALUES (?, ?, ?, ?, ?, ?)',
    [id, clientId, title, type, content || '', filename || '']
  );
  save();
}

function getPracticesForClient(clientId) {
  return queryAll('SELECT * FROM practices WHERE client_id = ? ORDER BY created_at DESC', [clientId]);
}

function toggleFavourite(practiceId) {
  getDbSync().run('UPDATE practices SET is_favourite = 1 - is_favourite WHERE id = ?', [practiceId]);
  save();
}

function incrementUseCount(practiceId) {
  getDbSync().run('UPDATE practices SET use_count = use_count + 1 WHERE id = ?', [practiceId]);
  save();
}

function deletePractice(practiceId) {
  getDbSync().run('DELETE FROM practices WHERE id = ?', [practiceId]);
  save();
}

module.exports = {
  getDb, save,
  createFacilitator, getFacilitatorByEmail, getFacilitatorById,
  getAllFacilitators, updateFacilitatorPassword, deleteFacilitator, facilitatorCount,
  createClient, getClient, getClientByEmail, getAllClients, getAllClientsAdmin,
  updateArc, archiveClient, updateClientPassword, updateClientEmail,
  addSession, getSessionsForClient, getClientSessionsForClient,
  addPractice, getPracticesForClient, toggleFavourite, incrementUseCount, deletePractice,
};
