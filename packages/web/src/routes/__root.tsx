/// <reference types="vite/client" />
import type { ReactNode } from "react";
import archivoCss from "@fontsource-variable/archivo/wdth.css?url";
import bricolageCss from "@fontsource-variable/bricolage-grotesque/index.css?url";
import jetbrainsMonoCss from "@fontsource-variable/jetbrains-mono/index.css?url";
import outfitCss from "@fontsource-variable/outfit/index.css?url";
import scaffoldUiCss from "@scaffold-ui/components/styles.css?url";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import globalsCss from "~~/styles/globals.css?url";
import { seo } from "~~/utils/seo";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { name: "theme-color", content: "#1b1b1b" },
      ...seo(),
    ],
    links: [
      ...[archivoCss, outfitCss, jetbrainsMonoCss, bricolageCss].map(href => ({ rel: "stylesheet", href })),
      { rel: "stylesheet", href: scaffoldUiCss },
      { rel: "stylesheet", href: globalsCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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

function RootComponent() {
  return (
    <ThemeProvider enableSystem>
      <ScaffoldEthAppWithProviders>
        <Outlet />
      </ScaffoldEthAppWithProviders>
    </ThemeProvider>
  );
}

function NotFound() {
  return (
    <div className="flex items-center h-full flex-1 justify-center bg-base-200">
      <div className="text-center">
        <h1 className="text-6xl font-bold m-0 mb-1">404</h1>
        <h2 className="text-2xl font-semibold m-0">Page Not Found</h2>
        <p className="text-base-content/70 m-0 mb-4">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="btn btn-primary">
          Go Home
        </Link>
      </div>
    </div>
  );
}
