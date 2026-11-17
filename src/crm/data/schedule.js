/**
 * Days of the week list with keys and labels
 */
export const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

/**
 * Default gym operating schedule across the week
 */
export const DEFAULT_WEEK_SCHEDULE = {
  monday: { enabled: false, open: "06:00 AM", close: "10:00 PM" },
  tuesday: { enabled: false, open: "06:00 AM", close: "10:00 PM" },
  wednesday: { enabled: false, open: "06:00 AM", close: "10:00 PM" },
  thursday: { enabled: false, open: "06:00 AM", close: "10:00 PM" },
  friday: { enabled: false, open: "06:00 AM", close: "10:00 PM" },
  saturday: { enabled: false, open: "06:00 AM", close: "10:00 PM" },
  sunday: { enabled: false, open: "06:00 AM", close: "10:00 PM" },
};

/**
 * Default trainer operating schedule across the week
 */
export const DEFAULT_TRAINER_SCHEDULE = {
  monday: { enabled: true, open: "06:00 AM", close: "02:00 PM" },
  tuesday: { enabled: true, open: "06:00 AM", close: "02:00 PM" },
  wednesday: { enabled: true, open: "06:00 AM", close: "02:00 PM" },
  thursday: { enabled: true, open: "06:00 AM", close: "02:00 PM" },
  friday: { enabled: true, open: "06:00 AM", close: "02:00 PM" },
  saturday: { enabled: false, open: "06:00 AM", close: "02:00 PM" },
  sunday: { enabled: false, open: "06:00 AM", close: "02:00 PM" },
};

/**
 * Format weekly schedule into a human-readable summary string
 */
export function formatWeeklyScheduleSummary(schedule) {
  if (!schedule) return "Closed";
  const openDays = Object.values(schedule).filter((d) => d?.enabled);
  if (openDays.length === 0) return "Closed";
  const weekdaysOpen = ["monday", "tuesday", "wednesday", "thursday", "friday"].every(
    (k) =>
      schedule[k]?.enabled &&
      schedule[k]?.open === schedule.monday?.open &&
      schedule[k]?.close === schedule.monday?.close
  );
  if (
    weekdaysOpen &&
    schedule.saturday?.enabled &&
    schedule.saturday?.open === schedule.monday?.open
  ) {
    const sun = schedule.sunday?.enabled
      ? `Sunday: ${schedule.sunday.open} – ${schedule.sunday.close}`
      : "Sunday: Closed";
    return `Mon – Sat: ${schedule.monday.open} – ${schedule.monday.close} | ${sun}`;
  }
  return "Custom weekly operating schedule configured";
}
