// Gemini (plans, co-pilot, helper chat, vendor ranking) and Google Places (real vendors).
// Every function degrades to a safe fallback so the app keeps working without keys.
import { CAT_LIB, TYPE_CATS, TYPE_LABEL } from './plan.js';
import { getTradition } from '../public/traditions.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let client = null;

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

async function askJSON(system, user, temperature = 0.5) {
  if (!client) return null;
  const run = async (extra = '') => {
    const r = await client.models.generateContent({
      model: MODEL,
      contents: user + extra,
      config: { systemInstruction: system, responseMimeType: 'application/json', temperature, maxOutputTokens: 4096 },
    });
    return JSON.parse(r.text);
  };
  try {
    return await withTimeout(run(), 25000);
  } catch (e) {
    try { return await withTimeout(run('\nReturn ONLY valid JSON matching the requested shape.'), 25000); }
    catch (e2) { console.warn('[ai] Gemini JSON failed:', e2.message); return null; }
  }
}
async function askText(system, user, temperature = 0.6) {
  if (!client) return null;
  try {
    const r = await withTimeout(client.models.generateContent({
      model: MODEL, contents: user,
      config: { systemInstruction: system, temperature, maxOutputTokens: 700 },
    }), 20000);
    return (r.text || '').trim() || null;
  } catch (e) { console.warn('[ai] Gemini text failed:', e.message); return null; }
}
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// ---------- plan ----------
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
export async function aiHelperAnswer(ev, cat, question, lang, history = []) {
  const system = `${SHARED_RULES}
You coach one family member who is handling the "${cat.name}" task for ${ev.title} (${ev.sub}) in ${ev.city} on ${ev.date}, ${ev.guests} guests.
Their budget cap is ₹${cat.cap.toLocaleString('en-IN')}. Their steps: ${cat.steps.map((s, i) => `${i + 1}. ${s.t}${s.done ? ' (done)' : ''}`).join('; ')}.
Answer only about this task. If asked about anything else, say you can only help with ${cat.name.toLowerCase()}.
Reply in ${lang === 'ta' ? 'Tamil' : 'English'}, in 2 to 4 short sentences, practical and kind.`;
  const convo = history.slice(-6).map((m) => `${m.who === 'me' ? 'Helper' : 'Coach'}: ${m.t}`).join('\n');
  return askText(system, `${convo}\nHelper: ${question}\nCoach:`);
}

// ---------- vendors ----------
const SAMPLE_VENDORS = {
  venue: [['The Lantern Courtyard', 'Garden courtyard', 4.8, 142, 'v3'], ['Saffron Hall', 'Banquet hall', 4.6, 98, 'v1'], ['Riverside Terrace', 'Rooftop terrace', 4.5, 76, 'v3']],
  food: [['The Good Bite', 'Modern Indian', 4.8, 124, 'v1'], ['Plated Stories', 'Global fusion', 4.7, 96, 'v2'], ['Spice & Soul', 'Indian', 4.6, 78, 'v3']],
  decor: [['Bloom Theory', 'Floral styling', 4.8, 110, 'v1'], ['Fairy Light Co.', 'Lighting', 4.6, 84, 'v3'], ['Table Tales', 'Table styling', 4.5, 70, 'v2']],
  guests: [['Paper & Petals', 'Printed invites', 4.7, 120, 'v1'], ['Thamarai Crafts', 'Return gifts', 4.6, 88, 'v2'], ['Card Craft', 'Handmade cards', 4.5, 64, 'v3']],
  transport: [['Sri Balaji Travels', 'Tempo traveller', 4.6, 120, 'v3'], ['RK Tours', 'Minibus', 4.4, 98, 'v1'], ['City Cabs', 'Sedans and SUVs', 4.3, 76, 'v2']],
  entertainment: [['Acoustic Evenings', 'Live band', 4.8, 90, 'v3'], ['DJ Nova', 'DJ', 4.6, 120, 'v2'], ['Magic Mani', 'Magician', 4.5, 60, 'v1']],
  photos: [['Light & Lens Studio', 'Traditional + candid', 4.7, 240, 'v1'], ['Golden Frame', 'Candid and film', 4.6, 150, 'v3'], ['Mangalyam Photography', 'Traditional', 4.4, 88, 'v2']],
  music: [['Thavil Nadaswaram Troupe', '6 artists', 4.8, 140, 'v1'], ['Kovai Melam', 'Melam and chenda', 4.5, 90, 'v3'], ['Raga Sound & Lights', 'Sound and lights', 4.4, 110, 'v2']],
};

function estimateFor(cat, ev, i) {
  const f = [1, 0.9, 0.8][i] || 0.85;
  if (cat.id === 'food') {
    const pp = Math.round((cat.cap / ev.guests) * f / 50) * 50;
    return `₹${(pp * 0.85 | 0).toLocaleString('en-IN')}–₹${pp.toLocaleString('en-IN')} / plate`;
  }
  const hi = Math.round(cat.cap * f / 1000) * 1000;
  const lo = Math.round(hi * 0.8 / 1000) * 1000;
  return `₹${lo.toLocaleString('en-IN')}–₹${hi.toLocaleString('en-IN')}`;
}

export function sampleVendors(cat, ev) {
  return (SAMPLE_VENDORS[cat.id] || SAMPLE_VENDORS.food).map(([name, tag, rating, reviews, img], i) => ({
    id: `sample-${cat.id}-${i}`, name, tag, rating, reviews, img: `/assets/${img}.jpg`, price: ['₹₹₹', '₹₹₹', '₹₹'][i],
    estimate: estimateFor(cat, ev, i),
    why: i === 0 ? `Top rated for ${ev.guests}-guest events and fits your cap.` : i === 1 ? 'Good reviews and flexible packages.' : 'Value pick within your budget.',
    phone: '', maps: `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + ev.city)}`,
    address: ev.city, sample: true,
  }));
}

export async function findVendors(cat, ev) {
  if (!placesEnabled()) return { vendors: sampleVendors(cat, ev), source: 'sample' };
  const q = `${ev.q?.[cat.id] || (CAT_LIB[cat.id]?.query || {})[ev.type] || cat.name} in ${ev.city}`;
  let places = [];
  try {
    const r = await withTimeout(fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.photos',
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 10, languageCode: 'en', regionCode: 'IN' }),
    }), 12000);
    if (!r.ok) throw new Error(`Places ${r.status}: ${(await r.text()).slice(0, 200)}`);
    places = (await r.json()).places || [];
  } catch (e) {
    console.warn('[places]', e.message);
    return { vendors: sampleVendors(cat, ev), source: 'sample', note: 'Live vendor search is unavailable right now. Showing examples.' };
  }
  if (!places.length) return { vendors: sampleVendors(cat, ev), source: 'sample', note: `No ${cat.name.toLowerCase()} vendors found near ${ev.city}. Showing examples.` };

  const base = places.map((p) => ({
    id: p.id, name: p.displayName?.text || 'Unnamed', rating: p.rating || null, reviews: p.userRatingCount || 0,
    address: p.formattedAddress || '', phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
    maps: p.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text || '')}`,
    img: p.photos?.[0]?.name ? `/api/photo?name=${encodeURIComponent(p.photos[0].name)}` : null,
    priceLevel: p.priceLevel || null,
    price: { PRICE_LEVEL_INEXPENSIVE: '₹', PRICE_LEVEL_MODERATE: '₹₹', PRICE_LEVEL_EXPENSIVE: '₹₹₹', PRICE_LEVEL_VERY_EXPENSIVE: '₹₹₹₹' }[p.priceLevel] || '',
    tag: (p.formattedAddress || '').split(',').slice(-3, -2)[0]?.trim() || '',
  }));

  // Gemini ranks and explains; it can only reference ids we sent.
  const ranked = await askJSON(`${SHARED_RULES}
Rank vendors for a family. Return JSON {"picks":[{"id": id from the list, "why": one short sentence, max 14 words, "estimate": rupee range string labelled per plate for food}]} with the best 5 in order.`,
  `Task: ${cat.name} for ${ev.sub} in ${ev.city}, ${ev.guests} guests, cap ₹${cat.cap}. Food: ${ev.food.join(', ')}.
Vendors: ${JSON.stringify(base.map(({ id, name, rating, reviews, address, priceLevel }) => ({ id, name, rating, reviews, address, priceLevel })))}`, 0.3);

  let out;
  if (ranked?.picks?.length) {
    const byId = Object.fromEntries(base.map((b) => [b.id, b]));
    out = ranked.picks.filter((p) => byId[p.id]).slice(0, 5).map((p, i) => ({
      ...byId[p.id], why: String(p.why || '').slice(0, 120), estimate: String(p.estimate || estimateFor(cat, ev, i)).slice(0, 40),
    }));
  }
  if (!out?.length) {
    out = base
      .sort((a, b) => (b.rating || 0) * Math.log10((b.reviews || 0) + 10) - (a.rating || 0) * Math.log10((a.reviews || 0) + 10))
      .slice(0, 5)
      .map((b, i) => ({ ...b, why: b.rating ? `Rated ${b.rating} by ${b.reviews} people on Google.` : 'Listed on Google Maps near you.', estimate: estimateFor(cat, ev, i) }));
  }
  out.forEach((v, i) => { if (!v.img) v.img = `/assets/${['v1', 'v2', 'v3'][i % 3]}.jpg`; });
  return { vendors: out, source: 'places' };
}
