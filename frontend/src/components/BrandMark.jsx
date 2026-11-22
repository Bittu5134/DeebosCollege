export default function BrandMark({ className = '' }) {
  return (
    <svg
      className={className ? `brand-mark ${className}` : 'brand-mark'}
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 18.5H25" stroke="currentColor" strokeWidth="1" />
      <path
        d="M7 14.5V22.5M12 16.5V20.5M17 13.5V23.5M22 17V20"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="17" cy="9" r="2.5" fill="var(--reach)" />
    </svg>
  );
}
