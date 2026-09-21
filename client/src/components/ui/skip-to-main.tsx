import { useTranslation } from "react-i18next";

export function SkipToMainLink() {
  const { t } = useTranslation("common");
  return (
    <a href="#main-content" className="skip-to-main">
      {t("skipToMain")}
    </a>
  );
}
