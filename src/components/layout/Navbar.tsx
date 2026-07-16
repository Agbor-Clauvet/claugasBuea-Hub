import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import logoUrl from "@/assets/brand/claugas-express-logo.webp";

export function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const links: Array<{ to: string; label: string; hash?: string }> = [
    { to: "/", label: t("nav.home") },
    { to: "/", label: t("nav.products"), hash: "products" },
    { to: "/", label: t("nav.howItWorks"), hash: "how" },
    { to: "/", label: t("nav.safety"), hash: "safety" },
    { to: "/", label: t("nav.contact"), hash: "contact" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="ClauGas Express — Hub Buea"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
          />
          <span className="text-lg font-bold text-primary hidden sm:inline">ClauGas</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.hash ? `/#${l.hash}` : "/"}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {signedIn ? (
            <Button size="sm" onClick={() => navigate({ to: "/dashboard" })}>
              {t("nav.dashboard")}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ to: "/auth" })}
              >
                {t("nav.login")}
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
                {t("nav.register")}
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={t("nav.menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="md:hidden border-t bg-background">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {links.map((l, i) => (
              <a
                key={i}
                href={l.hash ? `/#${l.hash}` : "/"}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
