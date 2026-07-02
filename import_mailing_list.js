// ── One-off import: existing mailing list (Per Bot 6) ──
// Imports subscribers.csv into the users table as passive, email-only
// contacts — newsletter-opted-in only, no password, no login capability,
// Explorer tier. Safe to re-run: anyone already present (by email) is left
// alone except for making sure pref_email_news is on, so running this twice
// never creates duplicates or double-opts anyone in.
//
// WHAT IT DOES NOT DO: it does not touch member_tier, trial dates, or any
// other field on a row that already exists — if one of these 377 people
// already has a real Per Bot account (registered, maybe even a paying
// member), this only ensures their newsletter preference is on. Nothing
// else about their existing account is modified.
//
// HOW TO RUN (Railway console tab):
//   1. Put your CSV in the repo root as subscribers.csv (see below).
//   2. node import_mailing_list.js
//
// EXPECTED CSV COLUMNS (from your export): Subscriber (email), Name,
// "Last name". Any other columns (Sent, Opens, Clicks, Subscribed,
// Location, Status1, List, Tags) are read but ignored — this import only
// carries over the newsletter relationship itself, not engagement history
// or tags from the old platform.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const CSV_PATH = path.join(__dirname, 'subscribers.csv');

(async () => {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}`);
    console.error('Copy your export to the repo root as subscribers.csv, redeploy, then run this again.');
    process.exit(1);
  }

  await db.getDb();

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Read ${rows.length} rows from ${CSV_PATH}.`);

  let created = 0, alreadyExisted = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    try {
      const email = (row.Subscriber || '').trim().toLowerCase();
      if (!email || !email.includes('@')) { skipped++; continue; }

      const firstName = (row.Name || '').trim();
      const lastName  = (row['Last name'] || '').trim();
      const fullName  = [firstName, lastName].filter(Boolean).join(' ') || email;

      const existing = db.getUserByEmail(email);
      if (existing) {
        if (!existing.pref_email_news) {
          db.updateUserPreferences(existing.id, { pref_email_news: 1 });
        }
        alreadyExisted++;
        continue;
      }

      db.createMailingListContact(uuidv4(), fullName, email);
      created++;
    } catch (e) {
      errors++;
      console.error(`Row failed (${row.Subscriber || 'no email'}):`, e.message);
    }
  }

  console.log('');
  console.log('── Import complete ──');
  console.log(`Created new contacts:        ${created}`);
  console.log(`Already existed (news on'd): ${alreadyExisted}`);
  console.log(`Skipped (no valid email):    ${skipped}`);
  console.log(`Errors:                      ${errors}`);
  console.log(`Total processed:             ${rows.length}`);
})();
