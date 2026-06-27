const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'perbot.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      arc TEXT DEFAULT '',
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
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
  const data = db.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Client operations ──

function createClient(id, name) {
  const d = getDbSync();
  d.run('INSERT INTO clients (id, name) VALUES (?, ?)', [id, name]);
  save();
}

function getClient(id) {
  const d = getDbSync();
  const result = d.exec('SELECT * FROM clients WHERE id = ?', [id]);
  if (!result.length) return null;
  return rowsToObjects(result[0])[0];
}

function getAllClients(includeArchived = false) {
  const d = getDbSync();
  const query = includeArchived
    ? 'SELECT * FROM clients ORDER BY name ASC'
    : 'SELECT * FROM clients WHERE archived = 0 ORDER BY name ASC';
  const result = d.exec(query);
  if (!result.length) return [];
  return rowsToObjects(result[0]);
}

function archiveClient(clientId) {
  const d = getDbSync();
  d.run('UPDATE clients SET archived = 1 - archived WHERE id = ?', [clientId]);
  save();
}

function updateArc(clientId, arc) {
  const d = getDbSync();
  d.run('UPDATE clients SET arc = ? WHERE id = ?', [arc, clientId]);
  save();
}

// ── Session operations ──

function addSession(id, clientId, type, summary) {
  const d = getDbSync();
  d.run('INSERT INTO sessions (id, client_id, type, summary) VALUES (?, ?, ?, ?)',
    [id, clientId, type, summary]);
  save();
}

function getSessionsForClient(clientId) {
  const d = getDbSync();
  const result = d.exec(
    'SELECT * FROM sessions WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
  if (!result.length) return [];
  return rowsToObjects(result[0]);
}

// ── Practice operations ──

function addPractice(id, clientId, title, type, content, filename) {
  const d = getDbSync();
  d.run(
    'INSERT INTO practices (id, client_id, title, type, content, filename) VALUES (?, ?, ?, ?, ?, ?)',
    [id, clientId, title, type, content || '', filename || '']
  );
  save();
}

function getPracticesForClient(clientId) {
  const d = getDbSync();
  const result = d.exec(
    'SELECT * FROM practices WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
  if (!result.length) return [];
  return rowsToObjects(result[0]);
}

function toggleFavourite(practiceId) {
  const d = getDbSync();
  d.run('UPDATE practices SET is_favourite = 1 - is_favourite WHERE id = ?', [practiceId]);
  save();
}

function incrementUseCount(practiceId) {
  const d = getDbSync();
  d.run('UPDATE practices SET use_count = use_count + 1 WHERE id = ?', [practiceId]);
  save();
}

function deletePractice(practiceId) {
  const d = getDbSync();
  d.run('DELETE FROM practices WHERE id = ?', [practiceId]);
  save();
}

// ── Helpers ──

function getDbSync() {
  if (!db) throw new Error('DB not initialised — call getDb() first');
  return db;
}

function rowsToObjects(result) {
  return result.values.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

module.exports = {
  getDb,
  save,
  createClient,
  getClient,
  getAllClients,
  archiveClient,
  updateArc,
  addSession,
  getSessionsForClient,
  addPractice,
  getPracticesForClient,
  toggleFavourite,
  incrementUseCount,
  deletePractice,
};
