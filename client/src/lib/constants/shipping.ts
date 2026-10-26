import { i18next } from "@/i18n";
import { DEFAULT_CUSTOMER_SHIPPING_FEE_IQD } from "@shared/store-policy";
/** Legacy fallback only; interactive prices come from /api/settings/shipping. */
export const DELIVERY_FEE = DEFAULT_CUSTOMER_SHIPPING_FEE_IQD;
export const BAGHDAD_SHIPPING = DELIVERY_FEE;
export const OTHER_GOVERNORATES_SHIPPING = DELIVERY_FEE;
export const DELIVERY_DAYS = i18next.t("pages:shipping.s18");
export const BAGHDAD_DELIVERY_DAYS = DELIVERY_DAYS;
export const OTHER_DELIVERY_DAYS = DELIVERY_DAYS;
export const DELIVERY_TEXT = i18next.t("pages:shipping.s19", { v0: DELIVERY_FEE.toLocaleString(), v1: DELIVERY_DAYS });
export const WHATSAPP_NUMBER = "9647747880673";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
