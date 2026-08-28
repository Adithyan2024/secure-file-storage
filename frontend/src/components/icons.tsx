export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 0 1 7.5-1.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-mark">
      <defs>
        <linearGradient id="brandGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect x="3" y="10" width="18" height="11" rx="2" stroke="url(#brandGrad)" strokeWidth="1.8" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="url(#brandGrad)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.7" fill="url(#brandGrad)" />
    </svg>
  );
}
