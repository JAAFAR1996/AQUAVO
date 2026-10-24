// Static page generation imports page modules directly, outside React.lazy.
// Register their source copy synchronously before those modules are evaluated.
import { i18next } from "../client/src/i18n";
import tools from "../client/src/locales/ar/tools.json";
import guides from "../client/src/locales/ar/guides.json";

i18next.addResourceBundle("ar", "tools", tools, true, true);
i18next.addResourceBundle("ar", "guides", guides, true, true);
