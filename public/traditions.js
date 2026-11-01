// Traditions library shared by the server (plan building) and the browser (wizard).
// Every tradition lists its usual functions in order. Each function has:
//   d     days from the main date (negative = before, positive = after)
//   when  time of day
//   main  true for the main ceremony
//   needs tasks it adds to categories ({ c: category id, t: task })
// A tradition also picks the six categories on the orbit and can change vendor searches (q).
// Families can turn any function off, add functions from other traditions, or type their own.

const F = (id, name, d, when, needs = [], main = false) => ({ id, name, d, when, needs, main });

export const TRADITIONS = {
  wedding: [
    {
      id: 'tamil', name: 'Tamil', note: 'Nichayathartham to reception',
      cats: ['venue', 'music', 'photos', 'food', 'decor', 'guests'],
      q: { music: 'nadaswaram troupe', food: 'wedding caterers elai sappadu' },
      funcs: [
        F('nichayam', 'Nichayathartham', -45, 'Evening', [{ c: 'venue', t: 'Book a hall for the nichayathartham' }, { c: 'food', t: 'Plan the nichayathartham dinner' }]),
        F('pandhal', 'Pandhal kaal', -7, 'Morning', [{ c: 'decor', t: 'Arrange pandhal and pandhal kaal pooja items' }]),
        F('nalangu', 'Nalangu', -1, 'Evening', [{ c: 'decor', t: 'Set up nalangu seating and games' }]),
        F('muhurtham', 'Muhurtham', 0, 'Morning', [{ c: 'venue', t: 'Fix the priest and muhurtham time with the hall' }, { c: 'music', t: 'Book nadaswaram and thavil for the muhurtham' }, { c: 'guests', t: 'Pack thamboolam bags for guests' }], true),
        F('reception', 'Reception', 0, 'Evening', [{ c: 'music', t: 'Book light music for the reception' }, { c: 'photos', t: 'Plan reception stage photos' }]),
      ],
    },
    {
      id: 'telugu', name: 'Telugu', note: 'Pellikuthuru to talambralu',
      cats: ['venue', 'music', 'photos', 'food', 'decor', 'guests'],
      q: { music: 'sannai melam' },
      funcs: [
        F('nischitartham', 'Nischitartham', -45, 'Evening', [{ c: 'venue', t: 'Book a hall for the nischitartham' }]),
        F('pellikuthuru', 'Pellikuthuru', -1, 'Morning', [{ c: 'decor', t: 'Arrange turmeric, flowers and mangala snanam items' }]),
        F('snathakam', 'Snathakam & Kashi Yatra', 0, 'Morning', [{ c: 'music', t: 'Plan music for the Kashi Yatra' }]),
        F('jeelakarra', 'Jeelakarra Bellam & Talambralu', 0, 'Muhurtham', [{ c: 'venue', t: 'Fix the purohit and muhurtham time' }, { c: 'music', t: 'Book sannai melam for the muhurtham' }, { c: 'decor', t: 'Arrange talambralu rice and the mandapam' }], true),
        F('reception', 'Reception', 0, 'Evening', [{ c: 'photos', t: 'Plan reception stage photos' }]),
      ],
    },
    {
      id: 'kerala', name: 'Kerala', note: 'Temple thalikettu and sadya',
      cats: ['venue', 'music', 'photos', 'food', 'decor', 'guests'],
      q: { music: 'chenda melam', food: 'sadya caterers' },
      funcs: [
        F('engagement', 'Engagement', -45, 'Morning', [{ c: 'venue', t: 'Book a hall for the engagement' }]),
        F('thalikettu', 'Thalikettu', 0, 'Morning', [{ c: 'venue', t: 'Book the temple slot and a hall nearby' }, { c: 'music', t: 'Book chenda melam or nadaswaram' }, { c: 'decor', t: 'Arrange nilavilakku and thalam' }], true),
        F('sadya', 'Sadya', 0, 'Noon', [{ c: 'food', t: 'Book a sadya caterer with banana leaves' }]),
        F('reception', 'Reception', 0, 'Evening', [{ c: 'photos', t: 'Plan reception stage photos' }]),
      ],
    },
    {
      id: 'north', name: 'North Indian', note: 'Haldi, mehendi, sangeet, pheras',
      cats: ['venue', 'entertainment', 'photos', 'food', 'decor', 'guests'],
      q: { entertainment: 'dhol players and wedding band', decor: 'wedding decorators mandap' },
      funcs: [
        F('roka', 'Roka', -45, 'Evening', [{ c: 'food', t: 'Plan the roka dinner' }]),
        F('haldi', 'Haldi', -2, 'Morning', [{ c: 'decor', t: 'Arrange haldi setup and marigold decor' }]),
        F('mehendi', 'Mehendi', -2, 'Evening', [{ c: 'decor', t: 'Book mehendi artists' }]),
        F('sangeet', 'Sangeet', -1, 'Evening', [{ c: 'entertainment', t: 'Book a DJ and choreographer for the sangeet' }]),
        F('baraat', 'Baraat', 0, 'Evening', [{ c: 'entertainment', t: 'Book dhol and the baraat band' }, { c: 'guests', t: 'Arrange the ghodi or car for the baraat' }]),
        F('pheras', 'Pheras', 0, 'Night', [{ c: 'venue', t: 'Fix the pandit and the mandap timing' }], true),
        F('vidaai', 'Vidaai', 0, 'Night', [{ c: 'decor', t: 'Decorate the vidaai car' }]),
      ],
    },
    {
      id: 'bengali', name: 'Bengali', note: 'Gaye holud to bou bhaat',
      cats: ['venue', 'music', 'photos', 'food', 'decor', 'guests'],
      q: { music: 'shehnai players' },
      funcs: [
        F('aashirbaad', 'Aashirbaad', -7, 'Morning', [{ c: 'guests', t: 'Invite elders for the aashirbaad' }]),
        F('gayeholud', 'Gaye Holud', -1, 'Morning', [{ c: 'decor', t: 'Arrange turmeric and tattwa trays' }]),
        F('biye', 'Biye', 0, 'Evening', [{ c: 'venue', t: 'Fix the purohit and lagna time' }, { c: 'music', t: 'Book shehnai or dhak players' }], true),
        F('boubhaat', 'Bou Bhaat', 2, 'Noon', [{ c: 'food', t: 'Plan the bou bhaat lunch' }, { c: 'venue', t: 'Book a hall for the bou bhaat' }]),
      ],
    },
    {
      id: 'christian', name: 'Christian', note: 'Church wedding and reception',
      cats: ['venue', 'music', 'photos', 'food', 'decor', 'guests'],
      q: { music: 'church choir and wedding band', venue: 'wedding reception halls' },
      funcs: [
        F('engagement', 'Engagement', -45, 'Evening', [{ c: 'venue', t: 'Book a hall for the engagement' }]),
        F('church', 'Church wedding', 0, 'Morning', [{ c: 'venue', t: 'Confirm the church, banns and the priest' }, { c: 'music', t: 'Book the choir and organist' }, { c: 'decor', t: 'Arrange church flowers and the bouquet' }], true),
        F('reception', 'Reception', 0, 'Evening', [{ c: 'food', t: 'Order the wedding cake' }, { c: 'music', t: 'Book a band for the reception' }]),
      ],
    },
    {
      id: 'muslim', name: 'Muslim', note: 'Mehendi, nikah and walima',
      cats: ['venue', 'transport', 'photos', 'food', 'decor', 'guests'],
      q: { food: 'biryani caterers for weddings' },
      funcs: [
        F('mangni', 'Mangni', -45, 'Evening', [{ c: 'food', t: 'Plan the mangni dinner' }]),
        F('mehendi', 'Mehendi', -1, 'Evening', [{ c: 'decor', t: 'Book mehendi artists' }]),
        F('nikah', 'Nikah', 0, 'Afternoon', [{ c: 'venue', t: 'Confirm the qazi and the nikah venue' }, { c: 'guests', t: 'Arrange witnesses and the nikah papers' }], true),
        F('walima', 'Walima', 1, 'Evening', [{ c: 'food', t: 'Plan the walima menu' }, { c: 'venue', t: 'Book a hall for the walima' }]),
      ],
    },
    { id: 'custom', name: 'Mixed or my own', note: 'Pick functions from any tradition', cats: ['venue', 'music', 'photos', 'food', 'decor', 'guests'], q: {}, funcs: [] },
  ],
  birthday: [
    {
      id: 'milestone', name: 'Milestone birthday', note: '18th, 25th, 30th, 50th',
      cats: ['venue', 'guests', 'transport', 'food', 'decor', 'entertainment'], q: {},
      funcs: [
        F('cake', 'Cake cutting', 0, 'Evening', [{ c: 'decor', t: 'Order the cake' }], true),
        F('dinner', 'Dinner', 0, 'Evening', [{ c: 'food', t: 'Fix the dinner menu' }]),
        F('music', 'Music night', 0, 'Night', [{ c: 'entertainment', t: 'Book a singer or DJ' }]),
      ],
    },
    {
      id: 'kids', name: 'Kids birthday', note: 'Games, magic and return gifts',
      cats: ['venue', 'guests', 'transport', 'food', 'decor', 'entertainment'],
      q: { entertainment: 'magician for kids birthday party', decor: 'kids birthday party decorators' },
      funcs: [
        F('cake', 'Cake cutting', 0, 'Evening', [{ c: 'decor', t: 'Order a theme cake' }], true),
        F('games', 'Games & magic show', 0, 'Evening', [{ c: 'entertainment', t: 'Book a magician or games host' }]),
        F('gifts', 'Return gifts', 0, 'Evening', [{ c: 'guests', t: 'Buy return gifts for the children' }]),
      ],
    },
    {
      id: 'first', name: 'First birthday', note: 'Ayush homam and cake',
      cats: ['venue', 'guests', 'transport', 'food', 'decor', 'entertainment'], q: {},
      funcs: [
        F('ayush', 'Ayush homam', 0, 'Morning', [{ c: 'venue', t: 'Fix the priest for the ayush homam' }], true),
        F('cake', 'Cake cutting', 0, 'Evening', [{ c: 'decor', t: 'Order the cake' }]),
        F('dinner', 'Dinner', 0, 'Evening', [{ c: 'food', t: 'Fix the dinner menu' }]),
      ],
    },
    {
      id: 'sixty', name: '60th (Manivizha)', note: 'Shashtiabdapoorthi homams',
      cats: ['venue', 'guests', 'transport', 'food', 'decor', 'entertainment'],
      q: { entertainment: 'nadaswaram troupe', venue: 'kalyana mandapam' },
      funcs: [
        F('udhaka', 'Udhaka Shanthi', -1, 'Evening', [{ c: 'venue', t: 'Fix the priests for the homams' }]),
        F('ayush', 'Ayush homam', 0, 'Morning', [{ c: 'entertainment', t: 'Book nadaswaram for the homam' }], true),
        F('mangalyam', 'Thirumangalyadharanam', 0, 'Morning', [{ c: 'decor', t: 'Arrange thali, flowers and garlands' }]),
        F('lunch', 'Lunch', 0, 'Noon', [{ c: 'food', t: 'Plan the banana leaf lunch' }]),
      ],
    },
    { id: 'custom', name: 'My own', note: 'Pick your own functions', cats: ['venue', 'guests', 'transport', 'food', 'decor', 'entertainment'], q: {}, funcs: [] },
  ],
  community: [
    {
      id: 'pongal', name: 'Pongal', note: 'Kolam, pongal pots, games',
      cats: ['venue', 'transport', 'guests', 'food', 'decor', 'entertainment'], q: { entertainment: 'folk dance troupe kolattam' },
      funcs: [
        F('kolam', 'Kolam contest', 0, 'Morning', [{ c: 'decor', t: 'Arrange kolam powder and judges' }]),
        F('pongal', 'Pongal cooking', 0, 'Morning', [{ c: 'food', t: 'Arrange pongal pots, rice and jaggery' }], true),
        F('culture', 'Cultural program', 0, 'Evening', [{ c: 'entertainment', t: 'Book kolattam and silambam teams' }]),
        F('prizes', 'Prize distribution', 0, 'Evening', [{ c: 'guests', t: 'Buy prizes and certificates' }]),
      ],
    },
    {
      id: 'temple', name: 'Temple festival', note: 'Pooja, annadhanam, procession',
      cats: ['venue', 'transport', 'guests', 'food', 'decor', 'entertainment'], q: { entertainment: 'nadaswaram troupe', food: 'annadhanam caterers' },
      funcs: [
        F('kodiyetram', 'Kodiyetram', -2, 'Morning', [{ c: 'decor', t: 'Arrange the flag and flowers for kodiyetram' }]),
        F('pooja', 'Pooja & abhishekam', 0, 'Morning', [{ c: 'venue', t: 'Fix the priests and pooja timings' }], true),
        F('annadhanam', 'Annadhanam', 0, 'Noon', [{ c: 'food', t: 'Plan annadhanam for all devotees' }]),
        F('procession', 'Procession', 0, 'Evening', [{ c: 'transport', t: 'Plan the route and get police permission' }]),
      ],
    },
    {
      id: 'ganesh', name: 'Ganesh Chaturthi', note: 'Pandal, aarti, visarjan',
      cats: ['venue', 'transport', 'guests', 'food', 'decor', 'entertainment'], q: { decor: 'ganesh idol makers and pandal decorators' },
      funcs: [
        F('sthapana', 'Idol sthapana', 0, 'Morning', [{ c: 'decor', t: 'Book the idol and the pandal' }], true),
        F('aarti', 'Evening aarti', 0, 'Evening', [{ c: 'entertainment', t: 'Plan aarti and bhajans' }]),
        F('prasad', 'Prasad', 0, 'Evening', [{ c: 'food', t: 'Order modak and prasad' }]),
        F('visarjan', 'Visarjan', 3, 'Evening', [{ c: 'transport', t: 'Arrange the visarjan vehicle and permission' }]),
      ],
    },
    {
      id: 'christmas', name: 'Christmas', note: 'Carols, dinner, gifts',
      cats: ['venue', 'transport', 'guests', 'food', 'decor', 'entertainment'], q: { entertainment: 'choir and band for events' },
      funcs: [
        F('carols', 'Carol rounds', -3, 'Evening', [{ c: 'transport', t: 'Plan the carol route and vehicle' }]),
        F('dinner', 'Christmas dinner', 0, 'Evening', [{ c: 'food', t: 'Order cake and plan the dinner' }], true),
        F('play', 'Nativity play & games', 0, 'Evening', [{ c: 'entertainment', t: 'Plan the nativity play and games' }]),
        F('gifts', 'Gifts for children', 0, 'Evening', [{ c: 'guests', t: 'Buy gifts for the children' }]),
      ],
    },
    {
      id: 'eid', name: 'Eid get-together', note: 'Lunch, eidi and games',
      cats: ['venue', 'transport', 'guests', 'food', 'decor', 'entertainment'], q: { food: 'biryani caterers' },
      funcs: [
        F('lunch', 'Eid lunch', 0, 'Noon', [{ c: 'food', t: 'Plan biryani and sheer khurma' }], true),
        F('eidi', 'Eidi for children', 0, 'Afternoon', [{ c: 'guests', t: 'Buy eidi gifts for the children' }]),
        F('games', 'Games', 0, 'Evening', [{ c: 'entertainment', t: 'Plan games for families' }]),
      ],
    },
    {
      id: 'fest', name: 'College fest', note: 'Events, pro show, prizes',
      cats: ['venue', 'transport', 'guests', 'food', 'decor', 'entertainment'], q: { entertainment: 'live band for college events' },
      funcs: [
        F('inaug', 'Inauguration', 0, 'Morning', [{ c: 'guests', t: 'Invite the chief guest' }], true),
        F('events', 'Events & competitions', 0, 'Afternoon', [{ c: 'venue', t: 'Book rooms for each event' }]),
        F('proshow', 'Pro show', 0, 'Evening', [{ c: 'entertainment', t: 'Book the pro show artist' }]),
        F('prizes', 'Prize distribution', 0, 'Evening', [{ c: 'guests', t: 'Buy prizes and certificates' }]),
      ],
    },
    { id: 'custom', name: 'My own', note: 'Pick your own functions', cats: ['venue', 'transport', 'guests', 'food', 'decor', 'entertainment'], q: {}, funcs: [] },
  ],
};

export function getTradition(type, id) {
  const list = TRADITIONS[type] || [];
  return list.find((t) => t.id === id) || list[0] || null;
}

// Every function known for this event type, the chosen tradition's first, no duplicate names.
export function allFunctions(type, tradId) {
  const first = getTradition(type, tradId);
  const seen = new Set(), out = [];
  for (const t of [first, ...(TRADITIONS[type] || [])]) for (const f of t?.funcs || []) {
    if (seen.has(f.name)) continue; seen.add(f.name); out.push(f);
  }
  return out;
}
