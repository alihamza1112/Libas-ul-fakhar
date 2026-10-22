import { getCatalog } from "@/lib/server/catalog";
import { CatalogProvider } from "@/components/CatalogProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer, Toast, WhatsAppFloat } from "@/components/Footer";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  return (
    <CatalogProvider products={catalog}>
      <StoreProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ivory focus:p-3">Skip to content</a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <WhatsAppFloat />
        <Toast />
      </StoreProvider>
    </CatalogProvider>
  );
}
