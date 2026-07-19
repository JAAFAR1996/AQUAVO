// Safe fixture data for the Preview Order-Success simulation.
//
// This NEVER creates a real order — no API call, no stock/DB mutation. Product
// names/prices/images are real AQUAVO catalogue items (the brand's own assets) so
// the simulation reads authentically. The order number is an obvious SIM value.

export interface OrderSuccessItem {
  name: string;
  variantLabel?: string;
  quantity: number;
  price: number; // IQD, per unit
  image: string;
}

export interface OrderSuccessView {
  orderNumber: string;
  items: OrderSuccessItem[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  province: string;
  status: string;
  customerName: string;
  notes?: string;
}

const CDN = "https://res.cloudinary.com/dyczh8ogv/image/upload";

export const SIMULATED_ORDER: OrderSuccessView = {
  orderNumber: "SIM-260719-AQV1",
  items: [
    {
      name: "خشب ديكور للأحواض — قطعة DW-11",
      quantity: 1,
      price: 28000,
      image: `${CDN}/v1781098807/aquavo/products/aquavo/aquavo-driftwood-dw-11/hhtc4f2xdidislxk90nc.jpg`,
    },
    {
      name: "خشب ديكور للأحواض — قطعة DW-02",
      quantity: 2,
      price: 25000,
      image: `${CDN}/v1781166757/aquavo/products/aquavo/aquavo-driftwood-dw-02/maryqoeheeovhmgmfeud.jpg`,
    },
    {
      name: "حجر بركاني أحمر",
      variantLabel: "كيس 1 كغم",
      quantity: 3,
      price: 3000,
      image: `${CDN}/v1781171160/aquavo/products/houyi/houyi-volcanic-stone-red/hadcdyozfk5move8go3s.jpg`,
    },
  ],
  subtotal: 87000,
  shipping: 5000,
  total: 92000,
  paymentMethod: "الدفع نقداً عند الاستلام",
  province: "بغداد",
  status: "قيد المعالجة",
  customerName: "زبون تجريبي",
  notes: "يرجى الاتصال قبل التوصيل بنصف ساعة.",
};
