// Money is always integer paisa (PKR minor units). Rs. 2,499 => 249900.

export type DepartmentSlug = "men" | "women" | "boys" | "girls";

export type Garment =
  | "kurta"
  | "kameez"
  | "waistcoat"
  | "shirt"
  | "polo"
  | "tee"
  | "trouser"
  | "frock"
  | "shawl"
  | "cap"
  | "belt";

export interface Colour {
  name: string;
  hex: string;
}

export interface Variant {
  sku: string;
  size: string;
  colour: string;
  stock: number;
}

export interface Review {
  author: string;
  city: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
}

/** An uploaded product photo. Order in Product.images is display order. */
export interface ProductImage {
  id: string; // 16 hex chars; file is /media/products/<id>.webp
  url: string;
  width: number;
  height: number;
  /** Colour name this photo shows; undefined = applies to every colour. */
  colour?: string;
  alt?: string;
}

export type ProductStatus = "active" | "draft" | "archived";

/** A scheduled or open-ended sale price. Times are ISO UTC; missing = unbounded. */
export interface SaleSchedule {
  price: number;
  startsAt?: string;
  endsAt?: string;
}

export interface Product {
  id: string;
  status: ProductStatus;
  slug: string;
  name: string;
  department: DepartmentSlug;
  category: string;
  group: "Eastern" | "Western" | "Accessories";
  garment: Garment;
  /** Regular price. */
  basePrice: number;
  sale?: SaleSchedule;
  /** Effective selling price right now (derived from basePrice + sale). */
  price: number;
  /** Struck-through price while a sale is live (derived). */
  compareAt?: number;
  colours: Colour[];
  sizes: string[];
  variants: Variant[];
  images?: ProductImage[];
  fabric: string;
  fit: string;
  care: string[];
  description: string;
  modelInfo?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  /** Derived: created within the last 30 days. */
  isNew?: boolean;
  salesRank: number;
  preOrder?: { dispatch: string };
  rating: number;
  reviews: Review[];
}

export interface CartLine {
  productId: string;
  sku: string;
  qty: number;
}

export type PaymentMethod = "cod" | "bank";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed_delivery"
  | "return_requested"
  | "returned"
  | "refunded";

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  size: string;
  colour: string;
  unitPrice: number;
  qty: number;
  /** Snapshot for order views, so they don't depend on the live catalogue. */
  garment?: Garment;
  hex?: string;
  image?: string;
}

export interface AuditEntry {
  at: string;
  by: string;
  action: string;
  target: string;
  detail?: string;
}

export interface Address {
  name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  area?: string;
}

export interface Order {
  number: string;
  /** Set when placed while signed in. */
  customerId?: string;
  idempotencyKey: string;
  createdAt: string;
  status: OrderStatus;
  history: { status: OrderStatus; at: string; by: string; note?: string }[];
  items: OrderItem[];
  address: Address;
  payment: PaymentMethod;
  coupon?: string;
  totals: Totals;
  notes?: string;
}

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponApplied?: string;
  couponError?: string;
}

export interface SavedAddress extends Address {
  id: string;
  label?: string; // e.g. Home, Office
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name?: string;
  phone?: string; // 03xxxxxxxxx, set only once verified by OTP
  email?: string;
  googleSub?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  addresses: SavedAddress[];
  wishlist: string[]; // product ids
  marketingOptIn?: boolean;
}
