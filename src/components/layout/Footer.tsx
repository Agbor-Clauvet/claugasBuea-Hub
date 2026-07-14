import { useTranslation } from "react-i18next";
import clautechLogoUrl from "@/assets/brand/clautech-logo.webp";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <div className="text-sm font-semibold">ClauGas</div>
          <div className="text-xs text-muted-foreground">{t("brand.tagline")}</div>
        </div>
        <div className="flex flex-col items-center gap-1 md:items-end">
          <div className="text-xs text-muted-foreground">
            © {year} ClauGas · {t("footer.rights")}
          </div>
          <a href="#" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.poweredBy")}
            <img src={clautechLogoUrl} alt="ClauTech Digital Solutions" className="h-4 w-auto" />
          </a>
        </div>
      </div>
    </footer>
  );
}
