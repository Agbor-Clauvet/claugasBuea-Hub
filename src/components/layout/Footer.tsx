import { useTranslation } from "react-i18next";
import logoAsset from "@/assets/clautech-logo.png.asset.json";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-2">
          <img src={logoAsset.url} alt="ClauTech Digital Solutions" className="h-8 w-auto rounded" />
          <div>
            <div className="text-sm font-semibold">ClauGas</div>
            <div className="text-xs text-muted-foreground">{t("brand.tagline")}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          © {year} ClauGas · {t("footer.poweredBy")} · {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
