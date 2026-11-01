// Gemini (plans, co-pilot, helper chat, vendor ranking) and Google Places (real vendors).
// Every function degrades to a safe fallback so the app keeps working without keys.
import { CAT_LIB, TYPE_CATS, TYPE_LABEL } from './plan.js';
import { getTradition } from '../public/traditions.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let client = null;

/** Create the Gemini client when GEMINI_API_KEY is set. Returns true when AI is available. */
export async function initAI() {
  if (!process.env.GEMINI_API_KEY) return false;
  try {
    const { GoogleGenAI } = await import('@google/genai');
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return true;
  } catch (e) {
    console.warn('[ai] Gemini SDK failed to load:', e.message);
    return false;
  }
}
export const aiEnabled = () => !!client;
export const placesEnabled = () => !!process.env.PLACES_API_KEY;

const SHARED_RULES = `You help Indian families plan celebrations. Use rupees with Indian digit grouping (₹1,50,000).
Be culturally accurate for the event type and region. Use plain, simple words a first-time planner understands.
Never invent business names, phone numbers or addresses.`;

// Models to try in order. The first is GEMINI_MODEL; the rest are backups. Each model has its own
// free-tier daily quota, so when one says "quota used up" (429) we skip it until its quota resets
// and move to the next. Busy (503) or slow models get one quick retry, then the next model.
const BACKUPS =
  'gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-flash-latest,gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-flash-lite-latest';
const MODELS = [
  ...new Set([
    MODEL,
    ...(process.env.GEMINI_FALLBACK_MODELS || BACKUPS)
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  ]),
];
const restUntil = new Map(); // model -> time it can be tried again
const noThinking = new Set(); // models that reject a thinking level
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errText = (e) => String(e?.message || e);
/** How long a model should rest after a quota error, read from Google's "retry in 1h2m3s" hint. */
function restFor(e) {
  const m = errText(e).match(/retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i);
  if (!m) return 60 * 60 * 1000;
  return ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000 + 5000;
}

/**
 * Call Gemini, trying each model in MODELS until one answers.
 * Quota errors rest that model until its quota resets; busy or slow models get one quick retry.
 * @returns {Promise<string>} the reply text
 */
async function generate(contents, config, ms) {
  let last;
  for (const model of MODELS) {
    if ((restUntil.get(model) || 0) > Date.now()) continue;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const cfg = noThinking.has(model) ? config : { ...config, thinkingConfig: { thinkingLevel: 'low' } };
        const r = await withTimeout(client.models.generateContent({ model, contents, config: cfg }), ms);
        const text = (r.text || '').trim();
        if (!text) throw new Error('empty reply');
        return text;
      } catch (e) {
        last = e;
        const t = errText(e);
        if (!noThinking.has(model) && /thinking/i.test(t) && /\b400\b|INVALID_ARGUMENT/.test(t)) {
          noThinking.add(model);
          attempt--;
          continue;
        }
        console.warn(`[ai] ${model}: ${t.slice(0, 160)}`);
        if (/\b404\b|NOT_FOUND/.test(t)) {
          restUntil.set(model, Date.now() + 24 * 3600 * 1000);
          break;
        }
        if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(t)) {
          restUntil.set(model, Date.now() + restFor(e));
          break;
        }
        if (attempt === 0 && /timeout|\b50[034]\b|UNAVAILABLE|high demand|empty reply/i.test(t)) {
          await sleep(1000);
          continue;
        }
        break;
      }
    }
  }
  throw last || new Error('every model is resting; try again later');
}

/** Ask for JSON and parse it; returns null when no model gives valid JSON (callers then use templates). */
async function askJSON(system, user, temperature = 0.5) {
  if (!client) return null;
  const cfg = { systemInstruction: system, responseMimeType: 'application/json', temperature, maxOutputTokens: 8192 };
  try {
    return JSON.parse(await generate(user, cfg, 30000));
  } catch (e) {
    if (e instanceof SyntaxError) {
      try {
        return JSON.parse(await generate(user + '\nReturn ONLY valid JSON matching the requested shape.', cfg, 30000));
      } catch (e2) {
        console.warn('[ai] Gemini JSON failed:', errText(e2));
        return null;
      }
    }
    console.warn('[ai] Gemini JSON failed:', errText(e));
    return null;
  }
}
/** Ask for plain text; returns null on failure so callers can fall back to a canned answer. */
async function askText(system, user, temperature = 0.6) {
  if (!client) return null;
  try {
    return await generate(user, { systemInstruction: system, temperature, maxOutputTokens: 2048 }, 25000);
  } catch (e) {
    console.warn('[ai] Gemini text failed:', errText(e));
    return null;
  }
}
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// ---------- plan ----------
/** Gemini's draft for a new plan (steps, budget shares, ideas) for the chosen tradition and functions, or null. */
export async function aiPlan(input) {
  const trad = getTradition(input.type, input.tradition);
  const ids = trad?.cats || TYPE_CATS[input.type].map(([id]) => id);
  const system = `${SHARED_RULES}
You write event plans as JSON. Shape:
{"title": string, "tagline": string (max 5 words),
 "categories": [{"id": one of ${JSON.stringify(ids)}, "share": number 0-1 (fraction of the spendable budget), "steps": [4 to 6 short action steps, max 8 words each, in order]}],
 "ideas": [6 items {"title": 1-2 words, "text": one sentence}]}
Include every id exactly once. Shares must add up to 1.
Follow the family's tradition and region: use the right ritual names, food and vendors for it. Do not mix in customs from other traditions unless the family listed them.`;
  const user = `Event: ${input.sub || TYPE_LABEL[input.type]} (${input.type}) in ${input.city} on ${input.date}.
Tradition: ${trad && trad.id !== 'custom' ? trad.name : 'mixed, follow the functions listed'}.
Guests: ${input.guests}. Total budget: ₹${input.budget.toLocaleString('en-IN')} (10% will be kept as buffer).
Functions: ${input.funcs.join(', ') || 'none given'}. Food: ${input.food.join(', ') || 'not given'}. Vibe: ${input.vibe || 'not given'}.
Name: ${input.title || 'suggest one'}.`;
  const out = await askJSON(system, user, 0.5);
  if (!out || !Array.isArray(out.categories)) return null;
  return out;
}

// ---------- co-pilot ----------
/** Turn a host's plain-language request into a small change set, or null to use the rule-based co-pilot. */
export async function aiCopilot(ev, message) {
  const system = `${SHARED_RULES}
You are the host's planning co-pilot. Turn the request into a small change set. Return JSON:
{"reply": one short sentence, "changes": null or {"budgetPct": number (e.g. -15), "budget": number (new total in rupees), "date": "YYYY-MM-DD", "addFunction": string, "addSteps": [{"cat": category id, "text": short step}]}}
Only include keys that the request needs. Category ids: ${ev.cats.map((c) => c.id).join(', ')}.`;
  const user = `Today is ${new Date().toISOString().slice(0, 10)}. Event: ${ev.title}, ${ev.sub}, ${ev.city}, date ${ev.date}, ${ev.guests} guests, budget ₹${ev.budget}.
Functions: ${ev.funcs.join(', ')}.
Request: ${message}`;
  const out = await askJSON(system, user, 0.2);
  if (!out || typeof out.reply !== 'string') return null;
  return out;
}

// ---------- helper chat ----------
/** A short answer for a helper, limited to their own category, in English or Tamil. */
export async function aiHelperAnswer(ev, cat, question, lang, history = []) {
  const system = `${SHARED_RULES}
You coach one family member who is handling the "${cat.name}" task for ${ev.title} (${ev.sub}) in ${ev.city} on ${ev.date}, ${ev.guests} guests.
Their budget cap is ₹${cat.cap.toLocaleString('en-IN')}. Their steps: ${cat.steps.map((s, i) => `${i + 1}. ${s.t}${s.done ? ' (done)' : ''}`).join('; ')}.
Answer only about this task. If asked about anything else, say you can only help with ${cat.name.toLowerCase()}.
You can give advice but you cannot change the plan. Never say you changed, updated or saved anything. If asked to change the budget, dates or tasks, say how they could do it: the host uses the Ask Utsav button at the top of the plan; a helper asks the host.
Reply in ${lang === 'ta' ? 'Tamil' : 'English'}, in 2 to 4 short sentences, practical and kind.`;
  const convo = history
    .slice(-6)
    .map((m) => `${m.who === 'me' ? 'Helper' : 'Coach'}: ${m.t}`)
    .join('\n');
  return askText(system, `${convo}\nHelper: ${question}\nCoach:`);
}

// ---------- vendors ----------
const SAMPLE_VENDORS = {
  venue: [
    ['The Lantern Courtyard', 'Garden courtyard', 4.8, 142, 'v3'],
    ['Saffron Hall', 'Banquet hall', 4.6, 98, 'v1'],
    ['Riverside Terrace', 'Rooftop terrace', 4.5, 76, 'v3'],
  ],
  food: [
    ['The Good Bite', 'Modern Indian', 4.8, 124, 'v1'],
    ['Plated Stories', 'Global fusion', 4.7, 96, 'v2'],
    ['Spice & Soul', 'Indian', 4.6, 78, 'v3'],
  ],
  decor: [
    ['Bloom Theory', 'Floral styling', 4.8, 110, 'v1'],
    ['Fairy Light Co.', 'Lighting', 4.6, 84, 'v3'],
    ['Table Tales', 'Table styling', 4.5, 70, 'v2'],
  ],
  guests: [
    ['Paper & Petals', 'Printed invites', 4.7, 120, 'v1'],
    ['Thamarai Crafts', 'Return gifts', 4.6, 88, 'v2'],
    ['Card Craft', 'Handmade cards', 4.5, 64, 'v3'],
  ],
  transport: [
    ['Sri Balaji Travels', 'Tempo traveller', 4.6, 120, 'v3'],
    ['RK Tours', 'Minibus', 4.4, 98, 'v1'],
    ['City Cabs', 'Sedans and SUVs', 4.3, 76, 'v2'],
  ],
  entertainment: [
    ['Acoustic Evenings', 'Live band', 4.8, 90, 'v3'],
    ['DJ Nova', 'DJ', 4.6, 120, 'v2'],
    ['Magic Mani', 'Magician', 4.5, 60, 'v1'],
  ],
  photos: [
    ['Light & Lens Studio', 'Traditional + candid', 4.7, 240, 'v1'],
    ['Golden Frame', 'Candid and film', 4.6, 150, 'v3'],
    ['Mangalyam Photography', 'Traditional', 4.4, 88, 'v2'],
  ],
  music: [
    ['Thavil Nadaswaram Troupe', '6 artists', 4.8, 140, 'v1'],
    ['Kovai Melam', 'Melam and chenda', 4.5, 90, 'v3'],
    ['Raga Sound & Lights', 'Sound and lights', 4.4, 110, 'v2'],
  ],
};

function estimateFor(cat, ev, i) {
  const f = [1, 0.9, 0.8][i] || 0.85;
  if (cat.id === 'food') {
    const pp = Math.round(((cat.cap / ev.guests) * f) / 50) * 50;
    return `₹${((pp * 0.85) | 0).toLocaleString('en-IN')}–₹${pp.toLocaleString('en-IN')} / plate`;
  }
  const hi = Math.round((cat.cap * f) / 1000) * 1000;
  const lo = Math.round((hi * 0.8) / 1000) * 1000;
  return `₹${lo.toLocaleString('en-IN')}–₹${hi.toLocaleString('en-IN')}`;
}

/** Labelled example vendors used when live search is off; they are never presented as real businesses. */
export function sampleVendors(cat, ev) {
  return (SAMPLE_VENDORS[cat.id] || SAMPLE_VENDORS.food).map(([name, tag, rating, reviews, img], i) => ({
    id: `sample-${cat.id}-${i}`,
    name,
    tag,
    rating,
    reviews,
    img: `/assets/${img}.jpg`,
    price: ['₹₹₹', '₹₹₹', '₹₹'][i],
    estimate: estimateFor(cat, ev, i),
    why:
      i === 0
        ? `Top rated for ${ev.guests}-guest events and fits your cap.`
        : i === 1
          ? 'Good reviews and flexible packages.'
          : 'Value pick within your budget.',
    phone: '',
    maps: `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + ev.city)}`,
    address: ev.city,
    sample: true,
  }));
}

// Same category, city and cap -> reuse the last answer for 6 hours (saves Places and Gemini quota).
const vendorCache = new Map();
/**
 * Real vendors near the event from Google Places, ranked and explained by Gemini (cached for 6 hours).
 * Gemini can only pick from the place ids we send, so it can never invent a business.
 * @returns {Promise<{ vendors: object[], source: 'places' | 'sample', note?: string }>}
 */
export async function findVendors(cat, ev) {
  if (!placesEnabled()) return { vendors: sampleVendors(cat, ev), source: 'sample' };
  const key = [ev.id, cat.id, ev.city, cat.cap, ev.guests, ev.q?.[cat.id] || ''].join('|');
  const hit = vendorCache.get(key);
  if (hit && hit.at > Date.now() - 6 * 3600 * 1000) return hit.data;
  const data = await searchVendors(cat, ev);
  if (data.source === 'places') {
    vendorCache.set(key, { at: Date.now(), data });
    if (vendorCache.size > 500) vendorCache.delete(vendorCache.keys().next().value);
  }
  return data;
}
async function searchVendors(cat, ev) {
  const q = `${ev.q?.[cat.id] || (CAT_LIB[cat.id]?.query || {})[ev.type] || cat.name} in ${ev.city}`;
  let places = [];
  try {
    const r = await withTimeout(
      fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.PLACES_API_KEY,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.photos',
        },
        body: JSON.stringify({ textQuery: q, maxResultCount: 10, languageCode: 'en', regionCode: 'IN' }),
      }),
      12000,
    );
    if (!r.ok) throw new Error(`Places ${r.status}: ${(await r.text()).slice(0, 200)}`);
    places = (await r.json()).places || [];
  } catch (e) {
    console.warn('[places]', e.message);
    return {
      vendors: sampleVendors(cat, ev),
      source: 'sample',
      note: 'Live vendor search is unavailable right now. Showing examples.',
    };
  }
  if (!places.length)
    return {
      vendors: sampleVendors(cat, ev),
      source: 'sample',
      note: `No ${cat.name.toLowerCase()} vendors found near ${ev.city}. Showing examples.`,
    };

  const base = places.map((p) => ({
    id: p.id,
    name: p.displayName?.text || 'Unnamed',
    rating: p.rating || null,
    reviews: p.userRatingCount || 0,
    address: p.formattedAddress || '',
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
    maps:
      p.googleMapsUri ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text || '')}`,
    img: p.photos?.[0]?.name ? `/api/photo?name=${encodeURIComponent(p.photos[0].name)}` : null,
    priceLevel: p.priceLevel || null,
    price:
      {
        PRICE_LEVEL_INEXPENSIVE: '₹',
        PRICE_LEVEL_MODERATE: '₹₹',
        PRICE_LEVEL_EXPENSIVE: '₹₹₹',
        PRICE_LEVEL_VERY_EXPENSIVE: '₹₹₹₹',
      }[p.priceLevel] || '',
    tag: (p.formattedAddress || '').split(',').slice(-3, -2)[0]?.trim() || '',
  }));

  // Gemini ranks and explains; it can only reference ids we sent.
  const ranked = await askJSON(
    `${SHARED_RULES}
Rank vendors for a family. Return JSON {"picks":[{"id": id from the list, "why": one short sentence, max 14 words, "estimate": rupee range string labelled per plate for food}]} with the best 5 in order.`,
    `Task: ${cat.name} for ${ev.sub} in ${ev.city}, ${ev.guests} guests, cap ₹${cat.cap}. Food: ${ev.food.join(', ')}.
Vendors: ${JSON.stringify(base.map(({ id, name, rating, reviews, address, priceLevel }) => ({ id, name, rating, reviews, address, priceLevel })))}`,
    0.3,
  );

  let out;
  if (ranked?.picks?.length) {
    const byId = Object.fromEntries(base.map((b) => [b.id, b]));
    out = ranked.picks
      .filter((p) => byId[p.id])
      .slice(0, 5)
      .map((p, i) => ({
        ...byId[p.id],
        why: String(p.why || '').slice(0, 120),
        estimate: String(p.estimate || estimateFor(cat, ev, i)).slice(0, 40),
      }));
  }
  if (!out?.length) {
    out = base
      .sort(
        (a, b) =>
          (b.rating || 0) * Math.log10((b.reviews || 0) + 10) - (a.rating || 0) * Math.log10((a.reviews || 0) + 10),
      )
      .slice(0, 5)
      .map((b, i) => ({
        ...b,
        why: b.rating ? `Rated ${b.rating} by ${b.reviews} people on Google.` : 'Listed on Google Maps near you.',
        estimate: estimateFor(cat, ev, i),
      }));
  }
  out.forEach((v, i) => {
    if (!v.img) v.img = `/assets/${['v1', 'v2', 'v3'][i % 3]}.jpg`;
  });
  return { vendors: out, source: 'places' };
}
/** Test hooks: inject a fake Gemini client and reach the private askText(). Not used by the app. */
export const __test = {
  setClient: (c) => {
    client = c;
  },
  askText: (u) => askText('s', u),
}; // for tests only
