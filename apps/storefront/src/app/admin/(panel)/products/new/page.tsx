import { adminListProducts, requestTime } from "@/lib/server/store";
import { boxChoicesFrom } from "../boxChoices";
import type { ProductInput } from "@/lib/productInput";
import { ProductEditor } from "../ProductEditor";
import { PageHeader } from "../../ui";

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
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={gift ? "Add Tohfa-e-Khaas gift box" : "Add product"}
        description="New products start as drafts so you can check them before they go live."
      />
      <ProductEditor initial={gift ? BLANK_BOX : BLANK} previewNow={await requestTime()} boxChoices={choices} />
    </div>
  );
}
