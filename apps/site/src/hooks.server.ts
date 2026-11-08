import type { Handle } from "@sveltejs/kit/hooks";

const security_headers = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
};

export const handle: Handle = ({ event, resolve }) => {
  event.setHeaders(security_headers);
  return resolve(event);
};
