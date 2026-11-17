export const FACILITIES = [
  'Parking',
  'Showers',
  'Lockers',
  'AC',
  'WiFi',
  'Steam Room',
  'Cafe',
  'Physio Corner',
  'CCTV',
  'Towel Service',
];

export const SERVICE_LIST = [
  'Personal Training',
  'Group Classes',
  'Sauna',
  'Nutrition Coaching',
  'Yoga Studio',
  'Massage Therapy',
];

export function isServiceAmenity(name) {
  if (!name || typeof name !== 'string') return false;
  const n = name.toLowerCase();
  const serviceKeywords = [
    'personal training',
    'nutrition',
    'diet',
    'class',
    'inbody',
    'physio',
    'rehab',
    'sauna',
    'steam',
    'yoga',
    'zumba',
    'dance',
    'hiit',
    'cross',
    'boxing',
    'martial',
    'swim',
    'spa',
    'massage',
    'towel',
    'coaching',
    'therapy',
  ];
  return serviceKeywords.some((kw) => n.includes(kw));
}

export const SCENES = {
  floor: 'Free weights floor',
  racks: 'Dumbbell zone',
  cardio: 'Cardio deck',
};

export function makeGym(g = {}) {
  const code = g.registration_number || g.reg_code || g.code || 'GYM001';
  return {
    id: g.id || '',
    registration_number: code,
    reg_code: code,
    code: code,
    name: g.name || '',
    loc: g.city || g.loc || '',
    owner: g.owner || g.owner_name || '',
    submitted: g.on || g.created_at || '',
    addr: g.address || g.addr || '',
    zip: g.postal_code || g.zip || '',
    phone: g.phone || '',
    email: g.email || '',
    lat: g.latitude || null,
    lng: g.longitude || null,
    about: g.description || g.about || '',
    facilities: g.facilities || [],
    services: g.services || [],
    hours: g.hours || {},
    photos: g.photos || [],
    staff: g.staff || [],
    trainers: g.trainers || [],
    members: g.members || [],
    reviews: g.reviews || [],
    txns: g.txns || [],
    wallet: g.wallet || { balance: 0, pending: 0, status: 'Active' },
    verified: Boolean(g.verified || g.is_verified),
    status: g.status || 'Active',
  };
}
