import type { Product } from "./types";

export interface SizeChart {
  title: string;
  columns: string[]; // measurement names, inches
  rows: [string, ...number[]][];
}

const MEN_TOPS: SizeChart = {
  title: "Men’s tops & kurtas",
  columns: ["Chest", "Shoulder", "Length (kurta)"],
  rows: [["XS", 36, 16.5, 40], ["S", 38, 17, 41], ["M", 40, 17.75, 42], ["L", 42, 18.5, 43], ["XL", 44, 19.25, 44], ["XXL", 46, 20, 45]],
};
const WOMEN_TOPS: SizeChart = {
  title: "Women’s tops & kurtas",
  columns: ["Bust", "Waist", "Hip"],
  rows: [["XS", 32, 26, 35], ["S", 34, 28, 37], ["M", 36, 30, 39], ["L", 39, 33, 42], ["XL", 42, 36, 45]],
};
const MEN_WAIST: SizeChart = {
  title: "Men’s trousers",
  columns: ["Waist", "Hip", "Inseam"],
  rows: [["28", 28, 36, 30], ["30", 30, 38, 31], ["32", 32, 40, 31.5], ["34", 34, 42, 32], ["36", 36, 44, 32], ["38", 38, 46, 32.5]],
};
const KIDS: SizeChart = {
  title: "Kids",
  columns: ["Height", "Chest", "Waist"],
  rows: [["2-3Y", 37, 21, 20], ["4-5Y", 43, 23, 21], ["6-7Y", 48, 25, 22], ["8-9Y", 53, 27, 23], ["10-11Y", 57, 29, 24], ["12-13Y", 61, 31, 25]],
};

export function chartFor(p: Product): SizeChart | undefined {
  if (p.sizes[0] === "One Size") return undefined;
  if (p.department === "boys" || p.department === "girls") return KIDS;
  if (p.department === "men") return p.garment === "trouser" ? MEN_WAIST : MEN_TOPS;
  return WOMEN_TOPS;
}

/** Rough recommendation from height (cm) and weight (kg) for adult tops (FR-PDP-12). */
export function recommendSize(p: Product, heightCm: number, weightKg: number): string | undefined {
  if (!heightCm || !weightKg || p.sizes[0] === "One Size") return undefined;
  if (p.department === "boys" || p.department === "girls") {
    const byHeight: [number, string][] = [[98, "2-3Y"], [110, "4-5Y"], [122, "6-7Y"], [134, "8-9Y"], [146, "10-11Y"], [999, "12-13Y"]];
    return byHeight.find(([h]) => heightCm <= h)?.[1];
  }
  const bmi = weightKg / (heightCm / 100) ** 2;
  let idx = bmi < 19 ? 0 : bmi < 21.5 ? 1 : bmi < 24 ? 2 : bmi < 27 ? 3 : bmi < 30 ? 4 : 5;
  if (heightCm > 185) idx += 1;
  if (heightCm < 160) idx -= 1;
  const sizes = p.sizes;
  return sizes[Math.max(0, Math.min(sizes.length - 1, idx))];
}
