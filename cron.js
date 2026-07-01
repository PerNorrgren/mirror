// ── cron.js ──
// Wires the three Per Bot 5 recurring jobs onto node-cron: daily MOTD send,
// the trial email sequence (day 3 / 10 / 14), and inactivity reminders.
//
// All schedules are UTC (node-cron's default, no timezone option set below).
// Times are staggered ten minutes apart so they never overlap on a slow boot.
//
// Each job is wrapped in try/catch individually — one job failing (e.g. Brevo
// having a bad moment) must never take down the others or crash the process.

const cron = require('node-cron');

function startCronJobs({ db, sendDailyMotd, emailTrialDay3, emailTrialDay10, emailTrialDay14, emailInactivityReminder }) {
  // ── Daily MOTD send — 07:00 UTC ──
  cron.schedule('0 7 * * *', async () => {
    try {
      const result = await sendDailyMotd();
      console.log('[cron] daily MOTD:', JSON.stringify(result));
    } catch (e) {
      console.error('[cron] daily MOTD send failed:', e.message);
    }
  });

  // ── Trial email sequence — 07:10 UTC ──
  cron.schedule('10 7 * * *', async () => {
    try {
      const day3 = db.getTrialEmailCandidates(3, 'trial_email_day3_sent');
      for (const user of day3) {
        await emailTrialDay3(user);
        db.markTrialEmailSent(user.id, 'trial_email_day3_sent');
      }

      const day10 = db.getTrialEmailCandidates(10, 'trial_email_day10_sent');
      for (const user of day10) {
        await emailTrialDay10(user);
        db.markTrialEmailSent(user.id, 'trial_email_day10_sent');
      }

      const day14 = db.getTrialEmailCandidates(14, 'trial_email_day14_sent');
      for (const user of day14) {
        await emailTrialDay14(user);
        db.markTrialEmailSent(user.id, 'trial_email_day14_sent');
      }

      console.log(`[cron] trial email sequence: day3=${day3.length} day10=${day10.length} day14=${day14.length}`);
    } catch (e) {
      console.error('[cron] trial email sequence failed:', e.message);
    }
  });

  // ── Inactivity reminders — 07:20 UTC ──
  cron.schedule('20 7 * * *', async () => {
    try {
      const inactive = db.getInactiveUsers(4);
      for (const user of inactive) {
        await emailInactivityReminder(user);
        db.markReminderSent(user.id);
      }
      console.log(`[cron] inactivity reminders sent: ${inactive.length}`);
    } catch (e) {
      console.error('[cron] inactivity reminders failed:', e.message);
    }
  });

  console.log('[cron] scheduled: daily MOTD (07:00 UTC), trial emails (07:10 UTC), inactivity reminders (07:20 UTC)');
}

module.exports = { startCronJobs };
