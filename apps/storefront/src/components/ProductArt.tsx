import type { Garment } from "@/lib/types";

// Placeholder product imagery: brand-consistent 4:5 studio illustrations,
// tinted per colour variant. Replaced by real photography from the CMS/media module.

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const PATHS: Record<Garment, (c: string, d: string, l: string, trim: string) => React.ReactNode> = {
  kurta: (c, d, l, trim) => (
    <>
      <path d="M168 74 Q200 92 232 74 L288 94 L338 262 L302 274 L274 176 L278 446 L122 446 L126 176 L98 274 L62 262 L112 94 Z" fill={c} />
      <path d="M126 176 L122 446 L150 446 L150 190 Z" fill={d} opacity=".35" />
      <path d="M168 74 Q200 92 232 74 L228 64 Q200 78 172 64 Z" fill={d} />
      <path d="M200 86 L200 196" stroke={d} strokeWidth="3" />
      {[110, 140, 170].map((y) => <circle key={y} cx="200" cy={y} r="3.5" fill={trim} />)}
      <path d="M122 446 L122 400 M278 446 L278 400" stroke={d} strokeWidth="2" />
      <path d="M174 80 Q200 100 226 80 L222 128 Q200 140 178 128 Z" fill="none" stroke={trim} strokeWidth="2" strokeDasharray="2 4" />
      <path d="M302 274 L338 262" stroke={l} strokeWidth="4" />
    </>
  ),
  kameez: (c, d, l, trim) => (
    <>
      <path d="M150 380 L146 470 L196 470 L200 400 L204 470 L254 470 L250 380 Z" fill={d} />
      <path d="M146 462 L196 462 M204 462 L254 462" stroke={shade(d, -0.2)} strokeWidth="5" />
      <path d="M168 66 Q200 84 232 66 L288 86 L336 246 L300 258 L274 168 L278 404 L122 404 L126 168 L100 258 L64 246 L112 86 Z" fill={c} />
      <path d="M126 168 L122 404 L148 404 L148 182 Z" fill={d} opacity=".3" />
      <path d="M168 66 Q200 84 232 66 L228 56 Q200 70 172 56 Z" fill={d} />
      <path d="M200 78 L200 180" stroke={d} strokeWidth="3" />
      {[100, 128, 156].map((y) => <circle key={y} cx="200" cy={y} r="3.5" fill={trim} />)}
      <path d="M300 258 L336 246" stroke={l} strokeWidth="4" />
    </>
  ),
  waistcoat: (c, d, l, trim) => (
    <>
      <path d="M150 70 L200 210 L250 70 L292 96 L300 190 L290 420 L210 430 L200 418 L190 430 L110 420 L100 190 L108 96 Z" fill={c} />
      <path d="M150 70 L200 210 L250 70 L244 64 L200 186 L156 64 Z" fill={d} />
      <path d="M200 210 L200 418" stroke={d} strokeWidth="3" />
      {[240, 280, 320, 360].map((y) => <circle key={y} cx="206" cy={y} r="4.5" fill={trim} />)}
      <path d="M126 300 L170 296 M232 296 L276 300" stroke={d} strokeWidth="4" />
      <path d="M244 160 L274 158" stroke={d} strokeWidth="3" />
      <path d="M108 96 L100 190" stroke={l} strokeWidth="3" opacity=".6" />
    </>
  ),
  shirt: (c, d, l, trim) => (
    <>
      <path d="M170 66 L230 66 L290 90 L340 250 L306 262 L276 170 L280 410 L120 410 L124 170 L94 262 L60 250 L110 90 Z" fill={c} />
      <path d="M170 66 L200 104 L230 66 L244 82 L214 118 L200 104 L186 118 L156 82 Z" fill={l} stroke={d} strokeWidth="1.5" />
      <path d="M200 104 L200 410" stroke={d} strokeWidth="2.5" />
      {[140, 190, 240, 290, 340].map((y) => <circle key={y} cx="206" cy={y} r="3" fill={trim} />)}
      <path d="M306 262 L340 250 L336 236 L302 248 Z M94 262 L60 250 L64 236 L98 248 Z" fill={d} />
      <path d="M148 150 L180 150 L180 182 L148 182 Z" fill="none" stroke={d} strokeWidth="2" />
      <path d="M124 170 L120 410 L146 410 L148 184 Z" fill={d} opacity=".25" />
    </>
  ),
  polo: (c, d, l, trim) => (
    <>
      <path d="M168 70 L232 70 L296 94 L330 170 L292 186 L274 156 L278 400 L122 400 L126 156 L108 186 L70 170 L104 94 Z" fill={c} />
      <path d="M168 70 L200 98 L232 70 L242 84 L212 112 L200 100 L188 112 L158 84 Z" fill={l} stroke={d} strokeWidth="1.5" />
      <path d="M192 100 L192 160 L208 160 L208 100" fill="none" stroke={d} strokeWidth="2" />
      {[118, 140].map((y) => <circle key={y} cx="200" cy={y} r="3" fill={trim} />)}
      <path d="M292 186 L330 170 M108 186 L70 170" stroke={d} strokeWidth="6" />
      <path d="M126 156 L122 400 L148 400 L150 170 Z" fill={d} opacity=".25" />
    </>
  ),
  tee: (c, d, l) => (
    <>
      <path d="M166 76 Q200 104 234 76 L296 98 L332 176 L292 192 L274 160 L278 400 L122 400 L126 160 L108 192 L68 176 L104 98 Z" fill={c} />
      <path d="M166 76 Q200 104 234 76 L228 70 Q200 94 172 70 Z" fill={d} />
      <circle cx="200" cy="230" r="44" fill="none" stroke={l} strokeWidth="6" opacity=".7" />
      <path d="M180 230 L196 246 L222 214" fill="none" stroke={l} strokeWidth="6" opacity=".7" />
      <path d="M126 160 L122 400 L148 400 L150 174 Z" fill={d} opacity=".25" />
    </>
  ),
  trouser: (c, d, l, trim) => (
    <>
      <path d="M126 70 L274 70 L290 460 L216 460 L200 170 L184 460 L110 460 Z" fill={c} />
      <path d="M126 70 L274 70 L276 96 L124 96 Z" fill={d} />
      {[150, 186, 214, 250].map((x) => <rect key={x} x={x - 4} y="68" width="8" height="30" fill={shade(d, -0.15)} />)}
      <circle cx="200" cy="83" r="4" fill={trim} />
      <path d="M200 96 L200 170" stroke={d} strokeWidth="2.5" />
      <path d="M150 110 Q140 140 132 150 M250 110 Q260 140 268 150" stroke={d} strokeWidth="2.5" fill="none" />
      <path d="M150 200 L144 450 M250 200 L256 450" stroke={l} strokeWidth="2" opacity=".6" />
    </>
  ),
  frock: (c, d, l, trim) => (
    <>
      <path d="M164 72 Q200 96 236 72 L262 86 L290 150 L262 162 L250 140 L248 230 L330 440 Q200 470 70 440 L152 230 L150 140 L138 162 L110 150 L138 86 Z" fill={c} />
      <path d="M152 230 L248 230 L250 250 L150 250 Z" fill={trim} />
      <path d="M70 440 Q200 470 330 440 L326 424 Q200 454 74 424 Z" fill={trim} opacity=".8" />
      {[120, 160, 200, 240, 280].map((x) => <circle key={x} cx={x} cy={360 + Math.abs(200 - x) / 6} r="6" fill={l} opacity=".8" />)}
      <path d="M164 72 Q200 96 236 72" stroke={d} strokeWidth="5" fill="none" />
      <path d="M152 230 L70 440 L110 446 Z" fill={d} opacity=".2" />
    </>
  ),
  shawl: (c, d, l, trim) => (
    <>
      <path d="M90 110 L310 110 L330 400 L70 400 Z" fill={c} />
      <path d="M90 110 L310 110 L314 160 L86 160 Z" fill={d} opacity=".5" />
      <path d="M100 140 L300 140 M96 370 L304 370" stroke={trim} strokeWidth="4" strokeDasharray="10 6" />
      {Array.from({ length: 26 }, (_, i) => 74 + i * 10).map((x) => <path key={x} d={`M${x} 400 L${x} 422`} stroke={d} strokeWidth="2" />)}
      <path d="M150 200 Q200 250 250 200 Q200 300 150 200 Z" fill={l} opacity=".5" />
      <path d="M120 260 Q200 330 280 260" stroke={d} strokeWidth="3" fill="none" opacity=".4" />
    </>
  ),
  cap: (c, d, l, trim) => (
    <>
      <path d="M110 330 Q110 180 200 180 Q290 180 290 330 Z" fill={c} />
      <path d="M110 330 L290 330 L290 280 Q200 296 110 280 Z" fill={d} />
      {[130, 160, 190, 220, 250, 275].map((x) => <circle key={x} cx={x} cy="306" r="7" fill={l} stroke={trim} strokeWidth="2" />)}
      <path d="M150 280 L200 214 L250 280" fill="none" stroke={trim} strokeWidth="3" />
      <ellipse cx="200" cy="332" rx="92" ry="10" fill={shade(d, -0.2)} />
    </>
  ),
  belt: (c, d, l, trim) => (
    <>
      <path d="M90 250 Q90 160 200 160 Q310 160 310 250 Q310 340 200 340 Q120 340 108 280" fill="none" stroke={c} strokeWidth="34" />
      <path d="M90 250 Q90 160 200 160 Q310 160 310 250" fill="none" stroke={l} strokeWidth="2" opacity=".5" transform="translate(0 -12)" />
      <rect x="84" y="250" width="56" height="64" rx="6" fill="none" stroke={trim} strokeWidth="8" />
      <path d="M112 250 L112 314" stroke={trim} strokeWidth="5" />
      {[170, 200, 230].map((x) => <circle key={x} cx={x} cy="340" r="3" fill={d} />)}
    </>
  ),
};

export function ProductArt({
  garment,
  hex,
  view = "front",
  embroidered = false,
  className,
  title,
}: {
  garment: Garment;
  hex: string;
  view?: "front" | "detail";
  embroidered?: boolean;
  className?: string;
  title?: string;
}) {
  const dark = shade(hex, -0.28);
  const light = shade(hex, 0.35);
  const isLight = parseInt(hex.slice(1), 16) > 0xcccccc;
  const trim = embroidered ? "#B8954A" : isLight ? shade(hex, -0.45) : shade(hex, 0.5);
  const id = `${garment}-${hex.slice(1)}-${view}`;
  return (
    <svg
      viewBox={view === "front" ? "0 0 400 500" : "110 40 180 225"}
      className={className}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#F7F0E5" />
          <stop offset="1" stopColor="#E9DBC6" />
        </linearGradient>
        <radialGradient id={`sh-${id}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#6b5640" stopOpacity=".22" />
          <stop offset="1" stopColor="#6b5640" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="400" height="500" fill={`url(#bg-${id})`} />
      <ellipse cx="200" cy="470" rx="150" ry="18" fill={`url(#sh-${id})`} />
      <g>{PATHS[garment](hex, dark, light, trim)}</g>
    </svg>
  );
}
