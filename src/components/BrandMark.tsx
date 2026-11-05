type BrandMarkProps = { compact?: boolean };

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="brand-lockup" aria-label="Meowks">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M8 17.5 15.5 7l5.1 7.2c2.2-.6 4.6-.6 6.8 0L32.5 7 40 17.5v17.2c0 2-1.6 3.6-3.6 3.6H11.6c-2 0-3.6-1.6-3.6-3.6V17.5Z" fill="currentColor"/>
          <path d="M17.5 25.2h.1m12.8 0h.1" stroke="#FFF4DF" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M20 31c2.4 2 5.6 2 8 0" stroke="#FFF4DF" strokeWidth="2.4" strokeLinecap="round"/>
          <path d="M4 23.5c-2 1.4-2.4 3.3-1 5.2" stroke="#42BFA7" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </span>
      {!compact && <span className="brand-name">meowks<span className="brand-dot">.</span></span>}
    </div>
  );
}