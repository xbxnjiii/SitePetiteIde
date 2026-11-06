// ⚠️ ILLUSTRATION PROVISOIRE de la mascotte (infirmière chibi : chignon,
// tenue bleue, stéthoscope, badge IDE). À remplacer par le fichier officiel
// fourni par La Petite IDE (public/img/mascotte.svg ou .webp).
export function Mascot({ className, title = "Mascotte La Petite IDE" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 240 280" className={className} role="img" aria-label={title}>
      {/* Corps / tenue */}
      <path d="M52 270c0-52 30-84 68-84s68 32 68 84z" fill="#4E7AC7" />
      <path d="M100 190l20 26 20-26" fill="#C5D8F4" />
      <path d="M96 188l24 30 24-30" fill="none" stroke="#3A63AB" strokeWidth="4" strokeLinejoin="round" />
      {/* Poche + badge IDE */}
      <rect x="132" y="226" width="34" height="22" rx="5" fill="#fff" />
      <text x="149" y="242" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="12" fill="#4E7AC7">IDE</text>
      {/* Stéthoscope */}
      <path d="M96 196c-6 22-4 42 10 50" fill="none" stroke="#2D3A5A" strokeWidth="5" strokeLinecap="round" />
      <path d="M144 196c4 18 2 30-6 38" fill="none" stroke="#2D3A5A" strokeWidth="5" strokeLinecap="round" />
      <circle cx="110" cy="250" r="9" fill="#EAA7C1" stroke="#2D3A5A" strokeWidth="4" />
      {/* Cou */}
      <rect x="108" y="168" width="24" height="24" rx="10" fill="#F6D3BE" />
      {/* Chignon */}
      <circle cx="120" cy="34" r="26" fill="#5A3E36" />
      <path d="M100 40c8 6 32 6 40 0" stroke="#EAA7C1" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* Tête */}
      <ellipse cx="120" cy="108" rx="70" ry="66" fill="#F9DFCF" />
      {/* Cheveux */}
      <path d="M50 108c0-44 30-72 70-72s70 28 70 72c-10-22-30-36-46-40-6 12-30 24-58 26-14 2-26 6-36 14z" fill="#5A3E36" />
      {/* Yeux */}
      <ellipse cx="94" cy="118" rx="8" ry="10" fill="#2D3A5A" />
      <ellipse cx="146" cy="118" rx="8" ry="10" fill="#2D3A5A" />
      <circle cx="97" cy="114" r="3" fill="#fff" />
      <circle cx="149" cy="114" r="3" fill="#fff" />
      {/* Joues */}
      <ellipse cx="80" cy="138" rx="11" ry="7" fill="#EAA7C1" opacity="0.7" />
      <ellipse cx="160" cy="138" rx="11" ry="7" fill="#EAA7C1" opacity="0.7" />
      {/* Sourire */}
      <path d="M108 140c6 8 18 8 24 0" fill="none" stroke="#2D3A5A" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
