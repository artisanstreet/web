import { StyleXDev } from "@artisanstreet/ui/stylex-dev";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import "@artisanstreet/ui/tokens.css";
import "../styles/layout.css";
import { create_query_client } from "../lib/query-client.ts";
import { CORE_API_BASE } from "../lib/env.ts";
import { security_headers } from "../lib/content-security.ts";
import { Button, Dialog, ToastProvider } from "@artisanstreet/ui";

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
      { title: "Dashboard — Artisan" },
      {
        name: "description",
        content: "Artisan account dashboard: machines, sessions, credentials, config, activity, security.",
      },
    ],
  }),
  component: RootComponent,
});

const NAV: ReadonlyArray<{ readonly to: string; readonly label: string; readonly group: string }> = [
  { to: "/", label: "Overview", group: "Account" },
  { to: "/sessions", label: "Sessions", group: "Account" },
  { to: "/security", label: "Security", group: "Account" },
  { to: "/machines", label: "Machines", group: "Machines" },
  { to: "/config", label: "Configuration", group: "Machines" },
  { to: "/credentials", label: "Credentials", group: "Secrets" },
  { to: "/activity", label: "Activity", group: "Secrets" },
];

function SidebarNav(): React.ReactElement {
  const groups = ["Account", "Machines", "Secrets"];
  return (
    <>
      {groups.map((group) => (
        <nav key={group} className="nav-group" aria-label={group}>
          <span className="nav-label">{group}</span>
          {NAV.filter((n) => n.group === group).map((n) => (
            <Link key={n.to} to={n.to} className="nav-link">
              {n.label}
            </Link>
          ))}
        </nav>
      ))}
    </>
  );
}

function RootComponent() {
  // Per-request Query client: module-global would share the cache across
  // SSR requests. useState initializer runs once per component instance.
  const [query_client] = React.useState(() => create_query_client());
  const [menu_open, set_menu_open] = React.useState(false);
  return (
    <RootDocument>
      <QueryClientProvider client={query_client}>
        <ToastProvider>
          <div className="shell">
            <a className="skip-link" href="#dashboard-main">
              Skip to content
            </a>
            <aside className="sidebar" aria-label="Dashboard sections">
              <a className="brand" href="/">
                <span className="brand-mark" aria-hidden="true" />
                Artisan
              </a>
              <SidebarNav />
            </aside>
            <header className="topbar">
              <a className="brand" href="/">
                <span className="brand-mark" aria-hidden="true" />
                Artisan
              </a>
              <Button variant="secondary" onClick={() => set_menu_open(true)}>
                Menu
              </Button>
            </header>
            <main id="dashboard-main" className="main">
              <Outlet />
            </main>
          </div>
          <Dialog
            open={menu_open}
            onOpenChange={(open) => set_menu_open(open)}
            title="Dashboard sections"
          >
            <div className="menu-links" onClick={() => set_menu_open(false)}>
              <SidebarNav />
            </div>
          </Dialog>
        </ToastProvider>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <StyleXDev />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
