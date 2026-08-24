import { useState } from 'react';

// Small "?" badge that shows a plain-language explanation on hover/tap.
// Used to make investing terminology (SIP, risk level, sector, etc.)
// approachable for students who are new to investing.
export default function InfoTip({ text, className = '' }) {
  const [open, setOpen] = useState(false);

  return (
    <span className={`relative inline-block align-middle ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="More info"
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-ink-200 text-ink-500 text-[10px] font-bold leading-none hover:bg-primary-100 hover:text-primary-700 transition-colors"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-ink-900 text-white text-[11px] leading-snug rounded-lg px-3 py-2 shadow-xl"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-ink-900" />
        </span>
      )}
    </span>
  );
}
