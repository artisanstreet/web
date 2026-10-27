// Request-secret custody: originating tab only, never the URL.
// sessionStorage survives a tab reload but stays tab-scoped (unlike
// localStorage); memory fallback covers private modes where storage throws.
// Secrets are never logged, never placed in URLs, never in history.

import { Either } from "effect";

const SECRET_PREFIX = "artisan.auth.request_secret:";

const read_storage = (key: string): string | null =>
  Either.match(Either.try({ try: () => sessionStorage.getItem(key), catch: () => null }), {
    onLeft: (): string | null => null,
    onRight: (value): string | null => value,
  });

const write_storage = (key: string, value: string): boolean =>
  Either.match(Either.try({ try: () => sessionStorage.setItem(key, value), catch: () => null }), {
    onLeft: () => false,
    onRight: () => true,
  });

const delete_storage = (key: string): void => {
  Either.getOrNull(Either.try({ try: () => sessionStorage.removeItem(key), catch: () => null }));
};

const secret_key = (request_id: string): string => `${SECRET_PREFIX}${request_id}`;

const memory_secrets = new Map<string, string>();

export const store_request_secret = (request_id: string, secret: string): void => {
  if (!write_storage(secret_key(request_id), secret)) {
    memory_secrets.set(request_id, secret);
  }
};

export const load_request_secret = (request_id: string): string | null =>
  read_storage(secret_key(request_id)) ?? memory_secrets.get(request_id) ?? null;

export const clear_request_secret = (request_id: string): void => {
  delete_storage(secret_key(request_id));
  memory_secrets.delete(request_id);
};

// Test seam: clear the in-memory fallback without touching storage.
export const clear_memory_secrets = (): void => {
  memory_secrets.clear();
};
