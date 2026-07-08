import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, setLanguage } from "@/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t("nav.language")}>
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{current.flag} {current.label}</span>
          <span className="sm:hidden">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={i18n.language === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span> {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
