/**
 * ==============================================================================
 * Fitaval CRM — Gym Profile UI Constants
 * ==============================================================================
 */

export const SERVICE_AMENITIES = [
  "Personal Training",
  "Nutrition & Diet Consultation",
  "Group Fitness Classes",
  "Body Composition / InBody Analysis",
  "Physiotherapy & Sports Rehab",
  "Steam & Sauna Recovery",
  "Yoga & Meditation Sessions",
  "Zumba & Dance Fitness",
  "HIIT & Cross-Training",
  "Boxing & Martial Arts",
  "Swimming Coaching",
  "Spa & Sports Massage",
  "Towel Service",
  "Locker Rental Service",
  "Guest & Buddy Passes",
];

export const FACILITY_AMENITIES = [
  "Air Conditioning",
  "Free High-Speed WiFi",
  "Free Parking & Valet",
  "Showers & Changing Rooms",
  "Secure Digital Lockers",
  "24/7 Biometric Access",
  "Cafeteria & Juice Bar",
  "RO Purified Drinking Water",
  "Cardio Cinema Zone",
  "CCTV Surveillance",
  "Supplement Store / Pro Shop",
  "Clean Restrooms & Vanity",
];

export const COMMON_AMENITIES = [
  ...SERVICE_AMENITIES,
  ...FACILITY_AMENITIES,
];

export const SERVICE_KEYWORDS = [
  "personal training",
  "nutrition",
  "diet",
  "group fitness",
  "group class",
  "classes",
  "inbody",
  "body composition",
  "physiotherapy",
  "rehab",
  "sauna",
  "steam",
  "yoga",
  "zumba",
  "dance",
  "hiit",
  "cross-training",
  "crossfit",
  "boxing",
  "martial arts",
  "swimming",
  "spa",
  "massage",
  "towel",
  "coaching",
  "pass",
  "induction",
  "therapy",
];

export const isServiceAmenity = (name) => {
  const lower = (name || "").toLowerCase();
  return SERVICE_KEYWORDS.some((k) => lower.includes(k));
};
