import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: "Modern heritage clothing for men, women and kids. Kurtas, shalwar kameez, waistcoats, shirts and shawls with cash on delivery across Pakistan.",
  openGraph: { siteName: SITE.name, type: "website", locale: "en_PK", images: ["/brand/icon-512.png"] },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // dir is driven by locale; Urdu (rtl) arrives in Phase 2. Layouts use logical properties.
  return (
    <html lang="en" dir="ltr" className={`${cormorant.variable} ${jost.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
