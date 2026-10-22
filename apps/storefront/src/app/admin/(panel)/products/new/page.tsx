import Link from "next/link";
import { requestTime } from "@/lib/server/store";
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

export default async function NewProductPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm underline">← Products</Link>
      <h1 className="text-3xl">Add product</h1>
      <p className="text-sm text-muted">New products start as drafts so you can check them before they go live.</p>
      <ProductEditor initial={BLANK} previewNow={await requestTime()} />
    </div>
  );
}
