/**
 * ==============================================================================
 * Fitaval CRM — Plans UI Constants
 * ==============================================================================
 */

export const DURATION_UNITS = [
  { unit: "Days", multiplier: 1 },
  { unit: "Weeks", multiplier: 7 },
  { unit: "Months", multiplier: 30 },
  { unit: "Years", multiplier: 365 },
];

export const PLAN_STATUS_FILTERS = [
  { id: "all", label: "All Plans" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export const POPULAR_PLAN_BENEFITS = [
  {
    title: "Gym floor & cardio zone access",
    description: "Unlimited daily access to strength and cardio equipment",
  },
  {
    title: "Free locker and shower usage",
    description: "Day locker allocation and clean shower amenities",
  },
  {
    title: "Fitness evaluation & body scan",
    description: "1 free initial body composition and BMI assessment",
  },
  {
    title: "Access to group fitness classes",
    description: "HIIT, Yoga, and Zumba community sessions included",
  },
  {
    title: "Steam & sauna recovery access",
    description: "Complimentary access to steam room and sauna recovery",
  },
  {
    title: "Personal training voucher",
    description: "Discount voucher for 1-on-1 personal coaching sessions",
  },
];
