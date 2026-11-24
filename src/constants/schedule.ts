export const SCHEDULE_TYPE_OPTIONS = [
  "One Time",
  "Once a Week",
  "Twice a Week",
] as const;

export type ScheduleType = (typeof SCHEDULE_TYPE_OPTIONS)[number];

export const TIME_SLOT_OPTIONS = [
  "08:00 AM - 12:00 PM",
  "12:00 PM - 04:00 PM",
  "04:00 PM - 09:00 PM",
];

export const WEEK_OPTIONS = [
  { label: "02 Weeks", value: "02" },
  { label: "03 Weeks", value: "03" },
  { label: "04 Weeks", value: "04" },
];

export const DAYS_OF_WEEK = [
  { id: "Mo", label: "Mo", dayIndex: 1, name: "Monday" },
  { id: "Tu", label: "Tu", dayIndex: 2, name: "Tuesday" },
  { id: "We", label: "We", dayIndex: 3, name: "Wednesday" },
  { id: "Th", label: "Th", dayIndex: 4, name: "Thursday" },
  { id: "Fr", label: "Fr", dayIndex: 5, name: "Friday" },
  { id: "Sa", label: "Sa", dayIndex: 6, name: "Saturday" },
  { id: "Su", label: "Su", dayIndex: 0, name: "Sunday" },
];

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];