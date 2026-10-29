import Link from "next/link";
import { adminListProducts, requestTime } from "@/lib/server/store";
import { boxChoicesFrom } from "../boxChoices";
import type { ProductInput } from "@/lib/productInput";
import { ProductEditor } from "../ProductEditor";

const BLANK: ProductInput = {
  name: "",
  status: "draft",
  department: "men",
  category: "kurta",
  garment: "kurta",
  basePrice: "",
  salePrice: "",
  fabric: "",
  fit: "Regular",
  description: "",
  care: "Machine wash cold, gentle cycle\nIron on medium heat, reverse side",
  tags: "",
  colours: [{ name: "Ivory", hex: "#F3EBDD" }],
  sizes: ["S", "M", "L", "XL"],
  variants: [],
};

const BLANK_BOX: ProductInput = {
  ...BLANK,
  name: "",
  department: "gifts",
  category: "gift-box",
  garment: "giftbox",
  fabric: "Assorted",
  fit: "",
  care: "",
  tags: "gift, tohfa",
  colours: [],
  sizes: [],
  bundle: { items: [], mode: "fixed" },
};

export default async function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  const gift = (await searchParams).type === "gift";
  const choices = boxChoicesFrom(await adminListProducts());
  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm underline">← Products</Link>
      <h1 className="text-3xl">{gift ? "Add Tohfa-e-Khaas gift box" : "Add product"}</h1>
      <p className="text-sm text-muted">New products start as drafts so you can check them before they go live.</p>
      <ProductEditor initial={gift ? BLANK_BOX : BLANK} previewNow={await requestTime()} boxChoices={choices} />
    </div>
  );
}
