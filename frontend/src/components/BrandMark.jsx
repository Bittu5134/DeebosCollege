export default function BrandMark({ className = '' }) {
  return (
    <img
      className={className ? `brand-mark ${className}` : 'brand-mark'}
      src="/favicon.ico"
      width="28"
      height="26"
      alt=""
      aria-hidden="true"
    />
  );
}
