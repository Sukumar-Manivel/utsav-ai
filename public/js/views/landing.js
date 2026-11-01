// Landing page: hero orbit, the three-step story and the two ways to start.
import { logo, planet } from '../router.js';
import { S } from '../state.js';
import { ic } from '../util.js';

export function viewLanding() {
  const moons = [
    ['venue', 'Venue'],
    ['food', 'Food'],
    ['decor', 'Decor'],
    ['guests', 'Guests'],
    ['transport', 'Transport'],
    ['entertainment', 'Music'],
  ];
  const demo = {
    title: "Riya's 30th Birthday",
    tagline: 'A brighter you ahead',
    hero: '/assets/portrait.jpg',
    type: 'birthday',
  };
  return `<div class="page">
  <header class="topbar">${logo()}
    <nav style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <a class="btn btn-ghost btn-sm" href="#/events">My events</a>
      ${S.cfg.firebase ? (S.fbUser ? `<button class="btn btn-ghost btn-sm" data-act="signout">Sign out</button>` : `<button class="btn btn-ghost btn-sm" data-act="signin">${ic('google')}Continue with Google</button>`) : ''}
    </nav></header>
  <section class="hero">
    <div>
      <h1>Plan it together. Celebrate it together.</h1>
      <p class="lede">Utsav AI turns your wedding, birthday or community event into a full plan in seconds: a rupee budget with 10% kept aside, a timeline and a vendor list. Then it gives each relative their own job, a simple step-by-step guide and real vendors near them.</p>
      <div class="cta-row">
        <button class="btn btn-coral" data-act="sample">${ic('spark')}Try a sample plan</button>
        <a class="btn btn-ghost" href="#/new">Start my plan</a>
      </div>
      <p class="fine">Sample: Riya’s 30th birthday · Coimbatore · 60 guests · ₹3,00,000. No sign-up needed.</p>
    </div>
    <div class="hero-orbit" aria-hidden="true">
      <div class="track">${moons
        .map(([id, n], i) => {
          const a = -Math.PI / 2 + (i * Math.PI) / 3;
          return `<span style="position:absolute;left:${50 + Math.cos(a) * 50}%;top:${50 + Math.sin(a) * 50}%;transform:translate(-50%,-50%)"><span class="moon glass"><span>${ic(id)}</span>${n}</span></span>`;
        })
        .join('')}</div>
      ${planet(demo, S.isM ? 200 : 250, 72)}
    </div>
  </section>
  <section class="journey" aria-label="How it works">
    <div><span class="lampi"><svg viewBox="0 0 40 40"><use href="#i-lamp"/></svg></span><h2>AI makes the plan</h2><p>Tell us the event, city, guests and budget. Gemini builds the budget split, timeline and ideas for your rituals.</p></div>
    <div><span class="lampi"><svg viewBox="0 0 40 40"><use href="#i-lamp"/></svg></span><h2>The family splits the work</h2><p>Give Sana the food and Aarav the venue. Each gets a private WhatsApp link. No app, no sign-up.</p></div>
    <div><span class="lampi"><svg viewBox="0 0 40 40"><use href="#i-lamp"/></svg></span><h2>Every helper gets a coach</h2><p>A next step, a call script in Tamil or English, red flags to avoid and real vendors from Google Maps.</p></div>
  </section>
  <section class="l-tags">
    <p class="tag-poem">People<br>Plans<br>Possibilities<br>All in one orbit.</p>
    <p class="tag-caps tc">Different people<br>brighter events<br>events bring us closer</p>
    <p class="tag-script" style="transform:rotate(-8deg)">Good people,<br>&nbsp;great events</p>
  </section>
  </div>`;
}
