import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Component, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadStoredLanguage } from "@/i18n";
import { initSentry, captureSentryException } from "@/lib/sentry";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import logoUrl from "@/assets/brand/claugas-express-logo.webp";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  captureSentryException(error);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errorPage.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errorPage.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("errorPage.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("errorPage.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

// Route-level errors (thrown while rendering a page) are already caught by
// TanStack Router's `errorComponent` above. This boundary is a second,
// broader safety net: it covers anything rendered OUTSIDE the router's
// <Outlet> — Toaster, WhatsAppButton, or the provider tree itself — so a
// crash there shows a friendly screen instead of a blank page.
class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(error);
    captureSentryException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We hit an unexpected error. Please reload the page.
            </p>
            <div className="mt-6">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ClauGas — Smart Gas Delivery for Buea" },
      {
        name: "description",
        content:
          "Fast, safe and reliable cooking gas cylinder delivery across Buea — Molyko, Great Soppo, GRA, Bonduma and more. Order anytime with live tracking and secure payment.",
      },
      { property: "og:title", content: "ClauGas — Smart Gas Delivery for Buea" },
      {
        property: "og:description",
        content:
          "Fast, safe and reliable cooking gas cylinder delivery across Buea. Order anytime with live tracking and secure payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ClauGas — Smart Gas Delivery for Buea" },
      {
        name: "twitter:description",
        content:
          "Fast, safe and reliable cooking gas cylinder delivery across Buea. Order anytime with live tracking and secure payment.",
      },
      {
        property: "og:image",
        content: `https://claugas-foundation.vercel.app${logoUrl}`,
      },
      {
        name: "twitter:image",
        content: `https://claugas-foundation.vercel.app${logoUrl}`,
      },
      // PWA installability
      { name: "theme-color", content: "#0462d3" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "ClauGas" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: logoUrl },
      { rel: "canonical", href: "https://claugas-foundation.vercel.app/" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "ClauGas",
          description:
            "Fast, safe and reliable cooking gas cylinder delivery across Buea, Cameroon.",
          url: "https://claugas-foundation.vercel.app/",
          image: `https://claugas-foundation.vercel.app${logoUrl}`,
          telephone: "+237650556715",
          email: "www.agborclauvet@gmail.com",
          priceRange: "XAF",
          areaServed: {
            "@type": "City",
            name: "Buea",
          },
          address: {
            "@type": "PostalAddress",
            addressLocality: "Buea",
            addressRegion: "South-West Region",
            addressCountry: "CM",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Applies the saved/system theme before first paint to avoid a light/dark flash */}
        <script src="/theme-init.js" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    initSentry();
  }, []);

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  useEffect(() => {
    // Only register in production — during local dev this just adds cache
    // confusion, and Vite's dev server doesn't need a cached shell anyway.
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    }
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster richColors position="top-right" />
        <WhatsAppButton />
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
