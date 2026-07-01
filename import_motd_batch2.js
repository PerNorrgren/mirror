// ── One-off import: Message of the Day, Batch 2 — Full Signal Range ──
// Run ONCE, after reviewing MOTD_Batch2_Full_Signal_Range.docx. Inserts all 30
// as status='draft' — nothing sends automatically. Same pattern as batch 1
// (import_motd_batch1.js): safe to re-run by accident, just creates duplicate
// drafts you can delete from the admin panel.
//
// HOW TO RUN (Railway console tab):
//   node import_motd_batch2.js

const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const MESSAGES = [
  // ── Sensory Anchoring (2) ──
  "Before anything else today, find the floor. Heels down, weight settling. That's not nothing — that's the first thing your body needs to know before it can do anything else.",
  "Five things you can see right now, nothing more complicated than that. Not to distract you. Just to remind the oldest part of your brain exactly where you are.",

  // ── Micro-Movements (2) ──
  "Press your thumb to your fingertip, slowly, on purpose. Small as it is, that's you choosing a movement, not the day choosing it for you.",
  "Let your jaw drop a millimetre. Not a yawn, not a sigh, just a millimetre of unclenching, chosen rather than forced. See what else follows it down.",

  // ── Curiosity / SEEKING — motivation focus (2) ──
  "If nothing feels worth bothering with today, that's not laziness talking. That's a system that's decided exploring is pointless. You don't have to argue with it. Just get quietly curious about one small thing, not to prove it wrong, just to see.",
  "Try wondering instead of trying. 'I wonder what's here' does something different in the body than 'let me find out'. One is curious. The other is a chase. Pick the curious one today.",

  // ── Rhythm, Timing, and Vibration (2) ──
  "Something steady — a hum, a slow tap on your knee, the pace of your own footsteps. Rhythm tells the body the next moment is expected. That's a kind of safety words can't deliver.",
  "Rotate both wrists slowly, together, like winding something gently. It doesn't need to mean anything. Predictable movement is its own quiet message: you know what happens next.",

  // ── Breath (2) ──
  "One breath in through the nose, then a small extra sniff on top, then let it all the way out, slow. That's not a trick. That's the exhale doing the one thing it's actually built to do.",
  "The out-breath is where the settling happens, not the in-breath. If you only have time for one thing today, make it the longer exhale.",

  // ── CT Touch (2) ──
  "Slow stroke, wrist to elbow, at the pace of an unhurried breath. Or just a warm hand flat on your chest. Either one tells your body someone safe is close, even when that someone is you.",
  "Touch doesn't have to come from someone else to count. Your own hand, slow and warm, on your own arm. The nervous system reads it the same way either way.",

  // ── Non-Reactive Attention (1) ──
  "Whatever's here right now doesn't need fixing before you're allowed to notice it. Just notice it. No plan required. The noticing is the whole instruction.",

  // ── Orientation to Present Context (1) ──
  "Name the year. The season. One thing in this room that could only be here today. The old alarm runs on outdated evidence — give it something current instead.",

  // ── Co-Regulation (1) ──
  "Before anyone says a word, their nervous system reads yours and yours reads theirs. You can't perform settled. You can only actually be it, even for a moment, and let that be the whole message.",

  // ── Warmth Toward the Body (1) ──
  "One hand, slow, resting at the centre of your chest. If warmth shows up, let it. If it doesn't, the hand's still doing its job. You don't need the feeling to arrive for the gesture to count.",

  // ── Reflection and Noticing Change (1) ──
  "Ten seconds of actual quiet. Then ask — not what should be different, just what is, even slightly. That small true answer is what your brain carries into tonight's sleep.",

  // ── Self-Affirmation — hard-on-self focus (3) ──
  "Not 'I'm doing great'. Something smaller and truer: I got out of bed. I answered one email. I stayed in the room when I wanted to leave. Say the true one, not the impressive one.",
  "If you're waiting to feel proud before you'll admit something went well, you'll be waiting a long time. Say the true thing first. The feeling, if it comes, comes after, not before.",
  "You did something today that the version of you six months ago couldn't have. It doesn't have to be large to be real. Name it in one plain sentence, out loud if you can manage it.",

  // ── Myelination Practice — the Moro Reflex Brake (5) ──
  "If you startle harder than the moment deserved — a dropped spoon, a door closing — that's not you being dramatic. That's a brake in your nervous system still learning its job. It builds slowly, the same way any skill does.",
  "Turn your head slowly to one side, not looking for anything, then slowly back to centre. Notice the return. That small, unhurried movement is quietly training the part of you that's supposed to catch a jolt before it takes over your whole body.",
  "The brake that stops a small surprise turning into a full-body flinch isn't something you're missing character for. It's a pathway that takes months to build, sometimes longer, one slow movement at a time. Patience with it is the practice.",
  "Right hand to your left knee. Left hand to your right shoulder. Slow, noticed, unhurried. Small as it looks, this crosses signals through exactly the part of the brain that's trying to grow a better brake against being startled.",
  "If sleep interrupts itself with a jolt just as you're drifting off, that's the same circuit, working overtime at the worst possible moment. It's not something to fight at midnight. It's something you build during the day, slowly, so there's less of it left for the night.",

  // ── Inflammatory Substrate Reduction (1) ──
  "Five short moments of warmth across the day do more for your body's own calming chemistry than one long session once a week ever could. Little and often beats occasional and large.",

  // ── Sleep (1) ──
  "Five minutes of settling before bed changes more than you'd think, more, in some ways, than the whole rest of the day. Your brain does its editing overnight. Give it something calm to edit.",

  // ── Nutritional Substrate (1) ──
  "The part of you that's trying to build a better brake against being startled is mostly made of fat — DHA, iron, the ordinary stuff of oily fish and green vegetables. If progress feels slower than it should, this is worth a look before anything else.",

  // ── Yoga Nidra (1) ──
  "There's a state right at the edge of sleep where you're still aware but the body's already let go. It's one of the few practices that reaches everything at once — alarm, chemistry, brake, and belief. Worth the twenty minutes if you can find them.",

  // ── Unconditionality (1) ──
  "Before anything is asked of you today, before you've achieved, produced, or proven anything, you're allowed to just arrive. One breath, unhurried, before any instruction. That's not a warm-up. That's the point.",
];

(async () => {
  await db.getDb();
  MESSAGES.forEach((body) => {
    db.addMotd(uuidv4(), body, null);
  });
  console.log(`Inserted ${MESSAGES.length} MOTD drafts (batch 2 — full signal range).`);
})();
