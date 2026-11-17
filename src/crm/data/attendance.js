/**
 * ==============================================================================
 * Fitaval CRM — Attendance UI Constants
 * ==============================================================================
 */

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present", short: "P", credit: 1, badge: "green", chip: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", dot: "bg-emerald-500" },
  { value: "late", label: "Late", short: "L", credit: 1, badge: "amber", chip: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", dot: "bg-amber-500" },
  { value: "half_day", label: "Half Day", short: "H", credit: 0.5, badge: "primary", chip: "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300", dot: "bg-sky-500" },
  { value: "absent", label: "Absent", short: "A", credit: 0, badge: "red", chip: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300", dot: "bg-red-500" },
  { value: "leave", label: "On Leave", short: "OL", credit: 0, badge: "default", chip: "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", dot: "bg-violet-500" },
];

export const ATTENDANCE_VIEW_TABS = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly Summary" },
];
