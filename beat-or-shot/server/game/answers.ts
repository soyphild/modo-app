/**
 * Validación de respuestas: tolera mayúsculas, tildes, puntuación, artículos y erratas razonables,
 * pero NO acepta respuestas distintas por simple semejanza.
 */

const ARTICLES = new Set(['el', 'la', 'los', 'las', 'the', 'a', 'an', 'le', 'les', 'il', 'lo', 'un', 'una', 'de', 'del', 'y', 'and', 'of']);

export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/&/g, ' y ')
    .replace(/\b(feat|ft|featuring)\b.*$/g, ' ')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normaliza y elimina palabras vacías (artículos, preposiciones). */
export function canonical(input: string): string {
  const words = normalize(input).split(' ').filter(Boolean);
  const kept = words.filter((w) => !ARTICLES.has(w));
  return (kept.length ? kept : words).join(' ');
}

/** Distancia Damerau-Levenshtein (transposiciones adyacentes). */
export function editDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const d: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

/** Erratas permitidas según la longitud de la respuesta correcta y la holgura del nivel. */
export function allowedTypos(length: number, fuzz: number): number {
  let base = length <= 3 ? 0 : length <= 6 ? 1 : length <= 12 ? 2 : 3;
  base += fuzz;
  if (length <= 3) base = Math.min(base, 0);
  return Math.max(0, base);
}

export function matches(input: string | undefined | null, candidates: string[], fuzz = 0): boolean {
  if (!input) return false;
  const given = canonical(input);
  if (given.length < 2) return false;
  const givenNoSpace = given.replace(/ /g, '');
  for (const cand of candidates) {
    const target = canonical(cand);
    if (!target) continue;
    if (given === target) return true;
    const targetNoSpace = target.replace(/ /g, '');
    if (givenNoSpace === targetNoSpace) return true;
    // La respuesta debe tener una longitud comparable: evita que "a" o "rock" acierten por accidente.
    if (givenNoSpace.length < Math.ceil(targetNoSpace.length * 0.7)) continue;
    if (givenNoSpace.length > Math.ceil(targetNoSpace.length * 1.4) + 1) continue;
    const dist = editDistance(givenNoSpace, targetNoSpace);
    if (dist <= allowedTypos(targetNoSpace.length, fuzz)) return true;
  }
  return false;
}

export function yearMatches(given: number | null | undefined, real: number, tolerance: number): boolean | null {
  if (given === null || given === undefined || Number.isNaN(given)) return null;
  return Math.abs(Number(given) - real) <= tolerance;
}
