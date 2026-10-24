// Fills a local database with venues, menus and entries to click through.
// Goes through the API with development tokens, so every rule applies as in the app:
//   AUTH_DEV_TOKENS=true ADMIN_FIREBASE_UIDS=admin pnpm nx serve api
//   pnpm nx run api:seed
// Production ignores development tokens, so this cannot write there.

const api = process.env.SEED_API_URL ?? 'http://localhost:3000/api';

/** `dev:<uid>:<name>` tokens; `admin` is listed in ADMIN_FIREBASE_UIDS. */
const people = {
  admin: 'admin:Admin',
  owner: 'dana:Dana',
  noa: 'noa:Noa',
  amit: 'amit:Amit',
  yael: 'yael:Yael',
  omer: 'omer:Omer',
};

async function call(method, path, body, who = people.admin) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer dev:${who}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path}: ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString();

const me = await call('GET', '/accounts/me');
if (!me.isAdmin) {
  throw new Error('Start the API with ADMIN_FIREBASE_UIDS=admin and AUTH_DEV_TOKENS=true.');
}
if ((await call('GET', '/venues')).length > 0) {
  console.log('The database already has venues; nothing to do.');
  process.exit(0);
}

// Reuses tags a failed earlier run left behind.
const existingTags = await call('GET', '/tags');
const tag = async (slug, he, en, kind) =>
  existingTags.find((found) => found.slug === slug) ??
  (await call('POST', '/tags', { slug, name: { he, en }, kind }));
const tags = {
  burger: await tag('hamburger', 'המבורגר', 'Hamburger', 'dish'),
  pizza: await tag('pizza', 'פיצה', 'Pizza', 'dish'),
  cocktail: await tag('cocktail', 'קוקטייל', 'Cocktail', 'dish'),
  beer: await tag('beer', 'בירה', 'Beer', 'dish'),
  vegetarian: await tag('vegetarian', 'צמחוני', 'Vegetarian', 'diet'),
  spicy: await tag('spicy', 'חריף', 'Spicy', 'flavour'),
};

// [he, en, price in agorot, tags, section index, entries as [who, rating, again, days ago]]
const venues = [
  {
    name: { he: 'מוזס', en: 'Moses' },
    address: 'רוטשילד 35, תל אביב',
    location: { lat: 32.0641, lng: 34.7744 },
    phone: '03-566 4949',
    sections: [
      { he: 'המבורגרים', en: 'Burgers' },
      { he: 'תוספות', en: 'Sides' },
    ],
    items: [
      [
        'המבורגר הבית',
        'House burger',
        6800,
        [tags.burger],
        0,
        [
          ['noa', 5, true, 2],
          ['amit', 4, true, 9],
          ['yael', 5, true, 20],
          ['omer', 4, true, 40],
        ],
      ],
      [
        'צ׳יזבורגר',
        'Cheeseburger',
        7200,
        [tags.burger],
        0,
        [
          ['noa', 4, true, 5],
          ['amit', 3, false, 12],
          ['yael', 4, true, 33],
        ],
      ],
      ['צ׳יפס', 'Fries', 2400, [], 1, [['omer', 3, false, 3]]],
    ],
  },
  {
    name: { he: 'פיצה לנה', en: 'Pizza Lena' },
    address: 'דיזנגוף 100, תל אביב',
    location: { lat: 32.0785, lng: 34.774 },
    phone: null,
    sections: [{ he: 'פיצות', en: 'Pizzas' }],
    items: [
      [
        'מרגריטה',
        'Margherita',
        5400,
        [tags.pizza, tags.vegetarian],
        0,
        [
          ['amit', 4, true, 25],
          ['noa', 5, true, 1],
          ['yael', 4, true, 15],
        ],
      ],
      ['פפרוני', 'Pepperoni', 6200, [tags.pizza, tags.spicy], 0, [['amit', 4, true, 7]]],
    ],
  },
  {
    name: { he: 'הבר של אלנבי', en: 'Allenby Bar' },
    address: 'אלנבי 58, תל אביב',
    location: { lat: 32.0682, lng: 34.7713 },
    phone: null,
    sections: [
      { he: 'קוקטיילים', en: 'Cocktails' },
      { he: 'בירות', en: 'Beers' },
    ],
    items: [
      [
        'נגרוני',
        'Negroni',
        5800,
        [tags.cocktail],
        0,
        [
          ['yael', 5, true, 4],
          ['omer', 4, true, 18],
        ],
      ],
      ['בירה מהחבית', 'Draft beer', 3200, [tags.beer], 1, [['amit', 3, true, 6]]],
    ],
  },
];

for (const venue of venues) {
  const created = await call('POST', '/venues', {
    name: venue.name,
    address: venue.address,
    location: venue.location,
    phone: venue.phone,
    sections: venue.sections,
  });
  const sections = await call('GET', `/venues/${created.id}/sections`);
  for (const [he, en, listPrice, itemTags, section, entries] of venue.items) {
    const item = await call('POST', `/venues/${created.id}/items`, {
      sectionId: sections[section].id,
      name: { he, en },
      listPrice,
      tagIds: itemTags.map((t) => t.id),
    });
    for (const [who, rating, wouldOrderAgain, days] of entries) {
      await call(
        'POST',
        `/items/${item.id}/entries`,
        {
          rating,
          wouldOrderAgain,
          pricePaid: listPrice,
          eatenAt: daysAgo(days),
          text: rating >= 4 ? 'טעים, אזמין שוב' : 'היה בסדר',
          visibility: 'public',
        },
        people[who],
      );
    }
  }
  venue.id = created.id;
}

// Dana owns Moses; a regular suggests an item there, which waits in her queue.
const moses = venues[0].id;
const dana = await call('GET', '/accounts/me', undefined, people.owner);
await call('POST', '/ownerships', { accountId: dana.id, venueId: moses });
const mosesSections = await call('GET', `/venues/${moses}/sections`);
await call(
  'POST',
  `/venues/${moses}/items`,
  {
    sectionId: mosesSections[0].id,
    name: { he: 'סמאש בורגר' },
    listPrice: null,
    tagIds: [tags.burger.id],
  },
  people.noa,
);

console.log(`Seeded ${venues.length} venues at ${api}; Dana (dev:${people.owner}) owns Moses.`);
