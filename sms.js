// ── sms.js ──
// Twilio SMS sending. Deliberately plain fetch + Basic Auth against Twilio's
// REST API rather than the `twilio` npm package — no new dependency to
// install/deploy, and it mirrors how sendEmail() talks to Scaleway directly
// in server.js. One function, same graceful-skip-if-not-configured pattern:
// if the env vars aren't set, this logs and returns instead of throwing, so
// a missing SMS config can never take down an email send or crash a request.
//
// REQUIRED ENV VARS:
//   TWILIO_ACCOUNT_SID   — starts with "AC..."
//   TWILIO_AUTH_TOKEN    — from the same Twilio console page as the SID
//   TWILIO_PHONE_NUMBER  — the number just purchased, E.164 format e.g. +447868280902
//
// `to` must also be E.164 format (+447...). Twilio rejects anything else.

const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

function isConfigured() {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

async function sendSms(to, body) {
  if (!isConfigured()) {
    console.log('TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER not set — skipping SMS to', to);
    return { ok: false, skipped: true };
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('Twilio SMS error:', res.status, data.message || data);
      return { ok: false, error: data.message || `Twilio returned ${res.status}` };
    }

    console.log('SMS sent to', to, '— sid:', data.sid);
    return { ok: true, sid: data.sid };
  } catch (e) {
    console.error('SMS error:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { isConfigured, sendSms };
