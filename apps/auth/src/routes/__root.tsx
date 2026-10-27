import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import "@artisanstreet/ui/tokens.css";
import "../styles/auth.css";
import { create_query_client } from "@artisanstreet/core-client";
import { CORE_API_BASE } from "../lib/env.ts";
import { security_headers } from "../lib/content-security.ts";

export const Route = createRootRoute({
  headers: ({ ssr }) => {
    const nonce = (ssr as { nonce?: unknown } | undefined)?.nonce;
    if (typeof nonce !== "string" || nonce.length === 0) return;
    return security_headers(nonce, CORE_API_BASE);
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "referrer", content: "no-referrer" },
      { title: "Sign in — Artisan" },
      {
        name: "description",
        content: "Sign in to Artisan with an emailed link.",
      },
    ],
    links: [{ rel: "icon", href: "data:," }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const [query_client] = React.useState(create_query_client);
  return (
    <RootDocument>
      <QueryClientProvider client={query_client}>
        <div className="auth-shell">
          <a className="skip-link" href="#auth-main">
            Skip to sign-in
          </a>
          <header className="auth-topbar">
            <a className="auth-brand" href="/">
              Artisan
            </a>
          </header>
          <main id="auth-main" className="auth-main">
            <Outlet />
          </main>
          <footer className="auth-footer">
            Sessions last 30 days and can be revoked anytime from the dashboard.
          </footer>
        </div>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
