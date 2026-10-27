// Presentation helpers: readable metadata, machine ids in mono, dates short.
// No invented metrics; every value comes from live API responses.

export const short_id = (id: string): string => {
  if (id.length <= 18) return id;
  return `${id.slice(0, 13)}…`;
};

export const format_when = (rfc3339: string | null): string => {
  if (!rfc3339) return "—";
  const parsed = Date.parse(rfc3339);
  if (Number.isNaN(parsed)) return rfc3339;
  return new Date(parsed).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const format_count = (label: string, count: number): string =>
  `${count} ${label}${count === 1 ? "" : "s"}`;
