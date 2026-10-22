// Store-wide settings. Replace placeholders before launch (BRD §10 open questions).
export const SITE = {
  name: "Libas-ul-Fakhar",
  arabic: "لِباسُ الفخر",
  tagline: "Garments worn with pride",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "923000000000", // international format, no +
  phone: "+92 300 0000000",
  email: "care@libasulfakhar.pk",
  hours: "Mon–Sat, 10am–8pm",
  // Sale end for the announcement countdown (FR-HOME-05)
  saleEndsAt: "2026-11-30T19:00:00Z",
  social: {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    tiktok: "https://tiktok.com/",
  },
};

export function whatsappLink(text: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}
