// Deterministic display formatting shared across features (importable by logic.ts).

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

// Every number nabd shows is Arabic-Indic (DESIGN_SYSTEM.md "One identity").
export function toArabicIndic(value: number): string {
  return String(value)
    .split('')
    .map((ch) => (ch >= '0' && ch <= '9' ? ARABIC_INDIC_DIGITS[Number(ch)] : ch))
    .join('')
}
