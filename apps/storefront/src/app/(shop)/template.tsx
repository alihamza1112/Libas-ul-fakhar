/** Re-mounts on every route change, so each new page fades in softly. */
export default function ShopTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
