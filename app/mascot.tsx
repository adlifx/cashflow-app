// Penny the coin: an original cartoon mascot drawn as inline SVG (no external images).
export default function Mascot({ size = 64, mood = "happy" }: { size?: number; mood?: "happy" | "worried" }) {
  const mouth = mood === "happy"
    ? <path d="M47 76 Q60 92 73 76 Z" fill="#9f1239" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    : <path d="M48 84 Q60 72 72 84" fill="none" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />;
  const sweat = mood === "worried" ? <path d="M96 40 Q102 50 96 54 Q90 50 96 40Z" fill="#7dd3fc" stroke="#1e1b4b" strokeWidth="3" strokeLinejoin="round" /> : null;
  return (
    <svg className="bob shrink-0" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Penny the coin mascot">
      <ellipse cx="60" cy="114" rx="30" ry="5" fill="#1e1b4b" opacity=".2" />
      <path d="M60 20 Q60 10 63 5" fill="none" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
      <path d="M63 9 Q75 0 86 9 Q74 16 63 9Z" fill="#4ade80" stroke="#1e1b4b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M61 11 Q50 3 40 11 Q51 18 61 11Z" fill="#86efac" stroke="#1e1b4b" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="66" r="46" fill="#fbbf24" stroke="#1e1b4b" strokeWidth="6" />
      <circle cx="60" cy="66" r="35" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round" />
      <ellipse cx="44" cy="60" rx="7" ry="9" fill="#1e1b4b" />
      <ellipse cx="76" cy="60" rx="7" ry="9" fill="#1e1b4b" />
      <circle cx="46" cy="56" r="2.8" fill="#fff" />
      <circle cx="78" cy="56" r="2.8" fill="#fff" />
      <circle cx="31" cy="76" r="6" fill="#fb7185" opacity=".75" />
      <circle cx="89" cy="76" r="6" fill="#fb7185" opacity=".75" />
      {mouth}
      {sweat}
      <path d="M100 22 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="#fff" stroke="#1e1b4b" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
