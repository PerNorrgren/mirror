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

  // ── Facilitators / Admin ──
  db.run(`CREATE TABLE IF NOT EXISTS facilitators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'facilitator',
    must_change_password INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Categories ──
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES categories(id)
  )`);

  // ── Courses ──
  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id TEXT,
    subcategory_id TEXT,
    cover_image TEXT DEFAULT '',
    guest_visible INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES categories(id)
  )`);

  // ── Lessons ──
  db.run(`CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    lesson_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    guest_accessible INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  // ── Lesson files ──
  db.run(`CREATE TABLE IF NOT EXISTS lesson_files (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  )`);

  // ── Playlists ──
  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id TEXT,
    subcategory_id TEXT,
    cover_image TEXT DEFAULT '',
    guest_visible INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES categories(id)
  )`);

  // ── Playlist tracks ──
  db.run(`CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    guest_accessible INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id)
  )`);

  // ── Standalone files ──
  db.run(`CREATE TABLE IF NOT EXISTS content_files (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    category_id TEXT,
    subcategory_id TEXT,
    guest_accessible INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES categories(id)
  )`);

  // ── Programme assignments (which programmes a facilitator/client belongs to) ──
  db.run(`CREATE TABLE IF NOT EXISTS programme_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_type TEXT NOT NULL,
    category_id TEXT NOT NULL,
    subcategory_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);

  // ── Clients ──
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    facilitator_id TEXT,
    category_id TEXT,
    subcategory_id TEXT,
    arc TEXT DEFAULT '',
    archived INTEGER DEFAULT 0,
    must_change_password INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (facilitator_id) REFERENCES facilitators(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES categories(id)
  )`);

  // ── Sessions ──
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    facilitator_id TEXT,
    type TEXT NOT NULL,
    summary TEXT NOT NULL,
    client_summary TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`);

  // ── Practices (client-specific) ──
  db.run(`CREATE TABLE IF NOT EXISTS practices (
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
  )`);

  // ── Content play/view history ──
  db.run(`CREATE TABLE IF NOT EXISTS content_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_type TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    played_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Seed default categories if none exist ──
  const existing = queryAll('SELECT id FROM categories LIMIT 1');
  if (!existing.length) {
    seedCategories();
  }

  save();
  return db;
}

function seedCategories() {
  const cats = [
    { id: 'cat-mindfulness', name: 'Mindfulness', slug: 'mindfulness', parent_id: null, sort_order: 1 },
    { id: 'cat-felt', name: 'FELT·FIBRE', slug: 'felt-fibre', parent_id: null, sort_order: 2 },
    { id: 'cat-girls', name: 'Girls Programme', slug: 'girls-programme', parent_id: null, sort_order: 3 },
    { id: 'cat-therapy', name: 'Therapy', slug: 'therapy', parent_id: null, sort_order: 4 },
    // Mindfulness subcategories
    { id: 'sub-mindfulness-life', name: 'Mindfulness for Life', slug: 'mindfulness-for-life', parent_id: 'cat-mindfulness', sort_order: 1 },
    { id: 'sub-mbct', name: 'MBCT', slug: 'mbct', parent_id: 'cat-mindfulness', sort_order: 2 },
    { id: 'sub-mbsr', name: 'MBSR', slug: 'mbsr', parent_id: 'cat-mindfulness', sort_order: 3 },
    { id: 'sub-mindfulness-intro', name: 'Introduction', slug: 'mindfulness-intro', parent_id: 'cat-mindfulness', sort_order: 4 },
    { id: 'sub-deeper-mindfulness', name: 'Deeper Mindfulness', slug: 'deeper-mindfulness', parent_id: 'cat-mindfulness', sort_order: 5 },
    // FELT subcategories
    { id: 'sub-felt-intro', name: 'Introduction', slug: 'felt-intro', parent_id: 'cat-felt', sort_order: 1 },
    { id: 'sub-felt-practitioner', name: 'Practitioner', slug: 'felt-practitioner', parent_id: 'cat-felt', sort_order: 2 },
    { id: 'sub-finding-calm', name: 'Finding Calm', slug: 'finding-calm', parent_id: 'cat-felt', sort_order: 3 },
    { id: 'sub-finding-joy', name: 'Finding Joy', slug: 'finding-joy', parent_id: 'cat-felt', sort_order: 4 },
    // Girls Programme subcategories
    { id: 'sub-girls-younger', name: 'Younger Girls', slug: 'girls-younger', parent_id: 'cat-girls', sort_order: 1 },
    { id: 'sub-girls-older', name: 'Older Girls', slug: 'girls-older', parent_id: 'cat-girls', sort_order: 2 },
    // Therapy subcategories
    { id: 'sub-cbt', name: 'CBT', slug: 'cbt', parent_id: 'cat-therapy', sort_order: 1 },
    { id: 'sub-felt-therapy', name: 'FELT·FIBRE Therapy', slug: 'felt-therapy', parent_id: 'cat-therapy', sort_order: 2 },
    { id: 'sub-therapy-general', name: 'General', slug: 'therapy-general', parent_id: 'cat-therapy', sort_order: 3 },
  ];

  cats.forEach(c => {
    db.run(
      'INSERT OR IGNORE INTO categories (id, name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)',
      [c.id, c.name, c.slug, c.parent_id, c.sort_order]
    );
  });
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
  getDbSync().run('INSERT INTO facilitators (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [id, name, email.toLowerCase(), passwordHash, role]);
  save();
}
function getFacilitatorByEmail(email) { return queryOne('SELECT * FROM facilitators WHERE email = ?', [email.toLowerCase()]); }
function getFacilitatorById(id) { return queryOne('SELECT * FROM facilitators WHERE id = ?', [id]); }
function getAllFacilitators() { return queryAll('SELECT id, name, email, role, created_at FROM facilitators WHERE role != ? ORDER BY name ASC', ['admin']); }
function updateFacilitatorPassword(id, passwordHash) {
  getDbSync().run('UPDATE facilitators SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, id]);
  save();
}
function deleteFacilitator(id) { getDbSync().run('DELETE FROM facilitators WHERE id = ?', [id]); save(); }

// ── Categories ──
function getAllCategories() { return queryAll('SELECT * FROM categories ORDER BY sort_order ASC, name ASC'); }
function getTopCategories() { return queryAll('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC'); }
function getSubcategories(parentId) { return queryAll('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC', [parentId]); }
function createCategory(id, name, slug, parentId, sortOrder) {
  getDbSync().run('INSERT INTO categories (id, name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)',
    [id, name, slug, parentId || null, sortOrder || 0]);
  save();
}
function deleteCategory(id) { getDbSync().run('DELETE FROM categories WHERE id = ?', [id]); save(); }

// ── Courses ──
function createCourse(id, title, description, categoryId, subcategoryId, guestVisible) {
  getDbSync().run('INSERT INTO courses (id, title, description, category_id, subcategory_id, guest_visible) VALUES (?, ?, ?, ?, ?, ?)',
    [id, title, description || '', categoryId, subcategoryId || null, guestVisible ? 1 : 0]);
  save();
}
function getCourse(id) { return queryOne('SELECT * FROM courses WHERE id = ?', [id]); }
function getAllCourses() {
  return queryAll(`SELECT c.*, cat.name as category_name, sub.name as subcategory_name
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN categories sub ON c.subcategory_id = sub.id
    ORDER BY cat.sort_order, c.sort_order, c.title`);
}
function getCoursesByCategory(categoryId, subcategoryId, guestOnly = false) {
  let sql = `SELECT c.*, cat.name as category_name, sub.name as subcategory_name
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN categories sub ON c.subcategory_id = sub.id
    WHERE c.category_id = ?`;
  const params = [categoryId];
  if (subcategoryId) { sql += ' AND c.subcategory_id = ?'; params.push(subcategoryId); }
  if (guestOnly) { sql += ' AND c.guest_visible = 1'; }
  return queryAll(sql, params);
}
function updateCourse(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  getDbSync().run(`UPDATE courses SET ${sets} WHERE id = ?`, [...Object.values(fields), id]);
  save();
}
function deleteCourse(id) {
  getDbSync().run('DELETE FROM lesson_files WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)', [id]);
  getDbSync().run('DELETE FROM lessons WHERE course_id = ?', [id]);
  getDbSync().run('DELETE FROM courses WHERE id = ?', [id]);
  save();
}

// ── Lessons ──
function createLesson(id, courseId, lessonNumber, title, description, guestAccessible) {
  getDbSync().run('INSERT INTO lessons (id, course_id, lesson_number, title, description, guest_accessible) VALUES (?, ?, ?, ?, ?, ?)',
    [id, courseId, lessonNumber, title, description || '', guestAccessible ? 1 : 0]);
  save();
}
function getLessonsForCourse(courseId) {
  return queryAll('SELECT * FROM lessons WHERE course_id = ? ORDER BY lesson_number ASC', [courseId]);
}
function updateLesson(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  getDbSync().run(`UPDATE lessons SET ${sets} WHERE id = ?`, [...Object.values(fields), id]);
  save();
}
function deleteLesson(id) {
  getDbSync().run('DELETE FROM lesson_files WHERE lesson_id = ?', [id]);
  getDbSync().run('DELETE FROM lessons WHERE id = ?', [id]);
  save();
}

// ── Lesson files ──
function addLessonFile(id, lessonId, filename, originalName, fileType, fileSize) {
  getDbSync().run('INSERT INTO lesson_files (id, lesson_id, filename, original_name, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
    [id, lessonId, filename, originalName, fileType, fileSize || 0]);
  save();
}
function getFilesForLesson(lessonId) {
  return queryAll('SELECT * FROM lesson_files WHERE lesson_id = ? ORDER BY sort_order ASC', [lessonId]);
}
function deleteLessonFile(id) { getDbSync().run('DELETE FROM lesson_files WHERE id = ?', [id]); save(); }

// ── Playlists ──
function createPlaylist(id, title, description, categoryId, subcategoryId, guestVisible) {
  getDbSync().run('INSERT INTO playlists (id, title, description, category_id, subcategory_id, guest_visible) VALUES (?, ?, ?, ?, ?, ?)',
    [id, title, description || '', categoryId, subcategoryId || null, guestVisible ? 1 : 0]);
  save();
}
function getPlaylist(id) { return queryOne('SELECT * FROM playlists WHERE id = ?', [id]); }
function getAllPlaylists() {
  return queryAll(`SELECT p.*, cat.name as category_name, sub.name as subcategory_name
    FROM playlists p
    LEFT JOIN categories cat ON p.category_id = cat.id
    LEFT JOIN categories sub ON p.subcategory_id = sub.id
    ORDER BY cat.sort_order, p.sort_order, p.title`);
}
function getPlaylistsByCategory(categoryId, subcategoryId, guestOnly = false) {
  let sql = `SELECT p.*, cat.name as category_name, sub.name as subcategory_name
    FROM playlists p
    LEFT JOIN categories cat ON p.category_id = cat.id
    LEFT JOIN categories sub ON p.subcategory_id = sub.id
    WHERE p.category_id = ?`;
  const params = [categoryId];
  if (subcategoryId) { sql += ' AND p.subcategory_id = ?'; params.push(subcategoryId); }
  if (guestOnly) { sql += ' AND p.guest_visible = 1'; }
  return queryAll(sql, params);
}
function deletePlaylist(id) {
  getDbSync().run('DELETE FROM tracks WHERE playlist_id = ?', [id]);
  getDbSync().run('DELETE FROM playlists WHERE id = ?', [id]);
  save();
}

// ── Tracks ──
function addTrack(id, playlistId, title, filename, originalName, fileType, fileSize, guestAccessible, sortOrder) {
  getDbSync().run('INSERT INTO tracks (id, playlist_id, title, filename, original_name, file_type, file_size, guest_accessible, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, playlistId, title, filename, originalName, fileType, fileSize || 0, guestAccessible ? 1 : 0, sortOrder || 0]);
  save();
}
function getTracksForPlaylist(playlistId) {
  return queryAll('SELECT * FROM tracks WHERE playlist_id = ? ORDER BY sort_order ASC', [playlistId]);
}
function updateTrack(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  getDbSync().run(`UPDATE tracks SET ${sets} WHERE id = ?`, [...Object.values(fields), id]);
  save();
}
function deleteTrack(id) { getDbSync().run('DELETE FROM tracks WHERE id = ?', [id]); save(); }

// ── Standalone files ──
function addContentFile(id, title, description, filename, originalName, fileType, fileSize, categoryId, subcategoryId, guestAccessible) {
  getDbSync().run('INSERT INTO content_files (id, title, description, filename, original_name, file_type, file_size, category_id, subcategory_id, guest_accessible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, description || '', filename, originalName, fileType, fileSize || 0, categoryId, subcategoryId || null, guestAccessible ? 1 : 0]);
  save();
}
function getAllContentFiles(categoryId, subcategoryId, guestOnly = false) {
  let sql = `SELECT f.*, cat.name as category_name, sub.name as subcategory_name
    FROM content_files f
    LEFT JOIN categories cat ON f.category_id = cat.id
    LEFT JOIN categories sub ON f.subcategory_id = sub.id WHERE 1=1`;
  const params = [];
  if (categoryId) { sql += ' AND f.category_id = ?'; params.push(categoryId); }
  if (subcategoryId) { sql += ' AND f.subcategory_id = ?'; params.push(subcategoryId); }
  if (guestOnly) { sql += ' AND f.guest_accessible = 1'; }
  return queryAll(sql, params);
}
function deleteContentFile(id) { getDbSync().run('DELETE FROM content_files WHERE id = ?', [id]); save(); }

// ── Programme assignments ──
function assignProgramme(id, userId, userType, categoryId, subcategoryId) {
  getDbSync().run('INSERT OR REPLACE INTO programme_assignments (id, user_id, user_type, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?)',
    [id, userId, userType, categoryId, subcategoryId || null]);
  save();
}
function getProgrammesForUser(userId, userType) {
  return queryAll(`SELECT pa.*, c.name as category_name, c.slug as category_slug,
    s.name as subcategory_name, s.slug as subcategory_slug
    FROM programme_assignments pa
    LEFT JOIN categories c ON pa.category_id = c.id
    LEFT JOIN categories s ON pa.subcategory_id = s.id
    WHERE pa.user_id = ? AND pa.user_type = ?`, [userId, userType]);
}
function removeProgrammeAssignment(id) { getDbSync().run('DELETE FROM programme_assignments WHERE id = ?', [id]); save(); }

// ── Clients ──
function createClient(id, name, facilitatorId, email, passwordHash, categoryId, subcategoryId) {
  getDbSync().run('INSERT INTO clients (id, name, facilitator_id, email, password_hash, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, facilitatorId, email || null, passwordHash || null, categoryId || null, subcategoryId || null]);
  save();
}
function getClient(id) { return queryOne('SELECT * FROM clients WHERE id = ?', [id]); }
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
    ? `SELECT c.*, f.name as facilitator_name, cat.name as category_name, sub.name as subcategory_name
       FROM clients c LEFT JOIN facilitators f ON c.facilitator_id = f.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN categories sub ON c.subcategory_id = sub.id ORDER BY c.name ASC`
    : `SELECT c.*, f.name as facilitator_name, cat.name as category_name, sub.name as subcategory_name
       FROM clients c LEFT JOIN facilitators f ON c.facilitator_id = f.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN categories sub ON c.subcategory_id = sub.id WHERE c.archived = 0 ORDER BY c.name ASC`;
  return queryAll(sql, []);
}
function updateArc(clientId, arc) { getDbSync().run('UPDATE clients SET arc = ? WHERE id = ?', [arc, clientId]); save(); }
function archiveClient(clientId) { getDbSync().run('UPDATE clients SET archived = 1 - archived WHERE id = ?', [clientId]); save(); }
function updateClientPassword(id, passwordHash) {
  getDbSync().run('UPDATE clients SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, id]);
  save();
}
function updateClientEmail(id, email) { getDbSync().run('UPDATE clients SET email = ? WHERE id = ?', [email.toLowerCase(), id]); save(); }
function updateClientProgramme(id, categoryId, subcategoryId) {
  getDbSync().run('UPDATE clients SET category_id = ?, subcategory_id = ? WHERE id = ?', [categoryId, subcategoryId || null, id]);
  save();
}

// ── Sessions ──
function addSession(id, clientId, facilitatorId, type, summary, clientSummary) {
  getDbSync().run('INSERT INTO sessions (id, client_id, facilitator_id, type, summary, client_summary) VALUES (?, ?, ?, ?, ?, ?)',
    [id, clientId, facilitatorId, type, summary, clientSummary || '']);
  save();
}
function getSessionsForClient(clientId) { return queryAll('SELECT * FROM sessions WHERE client_id = ? ORDER BY created_at DESC', [clientId]); }
function getClientSessionsForClient(clientId) {
  return queryAll('SELECT id, type, client_summary, created_at FROM sessions WHERE client_id = ? AND client_summary != "" ORDER BY created_at DESC', [clientId]);
}

// ── Practices ──
function addPractice(id, clientId, title, type, content, filename) {
  getDbSync().run('INSERT INTO practices (id, client_id, title, type, content, filename) VALUES (?, ?, ?, ?, ?, ?)',
    [id, clientId, title, type, content || '', filename || '']);
  save();
}
function getPracticesForClient(clientId) { return queryAll('SELECT * FROM practices WHERE client_id = ? ORDER BY created_at DESC', [clientId]); }
function toggleFavourite(practiceId) { getDbSync().run('UPDATE practices SET is_favourite = 1 - is_favourite WHERE id = ?', [practiceId]); save(); }
function incrementUseCount(practiceId) { getDbSync().run('UPDATE practices SET use_count = use_count + 1 WHERE id = ?', [practiceId]); save(); }
function deletePractice(practiceId) { getDbSync().run('DELETE FROM practices WHERE id = ?', [practiceId]); save(); }

// ── Content history ──
function recordPlay(id, userId, userType, contentType, contentId) {
  getDbSync().run('INSERT INTO content_history (id, user_id, user_type, content_type, content_id) VALUES (?, ?, ?, ?, ?)',
    [id, userId, userType, contentType, contentId]);
  save();
}

module.exports = {
  getDb, save,
  // Facilitators
  createFacilitator, getFacilitatorByEmail, getFacilitatorById,
  getAllFacilitators, updateFacilitatorPassword, deleteFacilitator,
  // Categories
  getAllCategories, getTopCategories, getSubcategories, createCategory, deleteCategory,
  // Courses
  createCourse, getCourse, getAllCourses, getCoursesByCategory, updateCourse, deleteCourse,
  // Lessons
  createLesson, getLessonsForCourse, updateLesson, deleteLesson,
  // Lesson files
  addLessonFile, getFilesForLesson, deleteLessonFile,
  // Playlists
  createPlaylist, getPlaylist, getAllPlaylists, getPlaylistsByCategory, deletePlaylist,
  // Tracks
  addTrack, getTracksForPlaylist, updateTrack, deleteTrack,
  // Content files
  addContentFile, getAllContentFiles, deleteContentFile,
  // Programmes
  assignProgramme, getProgrammesForUser, removeProgrammeAssignment,
  // Clients
  createClient, getClient, getClientByEmail, getAllClients, getAllClientsAdmin,
  updateArc, archiveClient, updateClientPassword, updateClientEmail, updateClientProgramme,
  // Sessions
  addSession, getSessionsForClient, getClientSessionsForClient,
  // Practices
  addPractice, getPracticesForClient, toggleFavourite, incrementUseCount, deletePractice,
  // History
  recordPlay,
};
