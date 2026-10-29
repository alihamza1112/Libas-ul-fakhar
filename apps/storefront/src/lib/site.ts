// Store-wide settings: brand contact details and social channels.
export const SITE = {
  name: "Libas-ul-Fakhar",
  arabic: "لِباسُ الفخر",
  tagline: "Garments worn with pride",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "923348322662", // international format, no +
  phone: "0334 8322662",
  phoneHref: "tel:+923348322662",
  email: "libasulfakhar@gmail.com",
  hours: "Mon–Sat, 10am–8pm",
  // Sale end for the announcement countdown (FR-HOME-05)
  saleEndsAt: "2026-11-30T19:00:00Z",
  social: {
    instagram: "https://www.instagram.com/libas_ul_fakhar",
    facebook: "https://www.facebook.com/share/19GQT7u59M/",
    tiktok: "https://www.tiktok.com/@libas_ul_fakhar",
    whatsappChannel: "https://whatsapp.com/channel/0029Vb2DqOtJ3jv1lEbxFH2w",
  },
};

export function whatsappLink(text: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}
