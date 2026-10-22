// Single outline icon set (BRD 3.2). 24px grid, 1.5 stroke, currentColor.
type P = React.SVGProps<SVGSVGElement>;

function Base({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p: P) => <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Base>;
export const UserIcon = (p: P) => <Base {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Base>;
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Base {...p} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20Z" /></Base>
);
export const BagIcon = (p: P) => <Base {...p}><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Base>;
export const MenuIcon = (p: P) => <Base {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Base>;
export const CloseIcon = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>;
export const ChevronIcon = (p: P) => <Base {...p}><path d="m9 6 6 6-6 6" /></Base>;
export const ChevronDownIcon = (p: P) => <Base {...p}><path d="m6 9 6 6 6-6" /></Base>;
export const TruckIcon = (p: P) => <Base {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></Base>;
export const ReturnIcon = (p: P) => <Base {...p}><path d="M4 10h11a5 5 0 0 1 0 10H9" /><path d="m8 6-4 4 4 4" /></Base>;
export const ShieldIcon = (p: P) => <Base {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></Base>;
export const CashIcon = (p: P) => <Base {...p}><rect x="2.5" y="6" width="19" height="12" rx="1.5" /><circle cx="12" cy="12" r="2.5" /></Base>;
export const RulerIcon = (p: P) => <Base {...p}><path d="M3 17 17 3l4 4L7 21l-4-4Z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></Base>;
export const ShareIcon = (p: P) => <Base {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></Base>;
export const StarIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Base {...p} fill={filled ? "currentColor" : "none"}><path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9L12 3Z" /></Base>
);
export const PlusIcon = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const MinusIcon = (p: P) => <Base {...p}><path d="M5 12h14" /></Base>;
export const FilterIcon = (p: P) => <Base {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Base>;
export const WhatsAppIcon = (p: P) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);
