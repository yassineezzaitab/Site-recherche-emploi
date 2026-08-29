/**
 * Lightweight lexical similarity between two texts (bag-of-words cosine
 * similarity over term frequencies).
 *
 * This is the "semantic-ish" layer of the matching engine: instead of an
 * embeddings API call (costly, non-deterministic across model versions,
 * requires a key we may not have), we tokenize both texts, drop French
 * stopwords, and compute cosine similarity over term-frequency vectors.
 * It captures topical overlap ("vente", "client", "caisse" appearing in
 * both a candidate's experience and a job description) without needing any
 * external service. It is intentionally a coarse signal — it is combined
 * with the exact-skill-match dimension, which is far more precise, rather
 * than used alone.
 */

const STOPWORDS = new Set(
  `le la les un une des de du au aux et ou en dans par pour avec sur sans sous
   ce cet cette ces son sa ses leur leurs notre nos votre vos mon ma mes
   qui que quoi dont où est sont a ont être avoir fait faire nous vous ils elles
   il elle on je tu se ne pas plus très bien tout tous toute toutes
   d l n s c j y à`
    .split(/\s+/)
    .filter(Boolean)
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents for robust matching
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/** Cosine similarity between two texts' term-frequency vectors, in [0, 1]. */
export function cosineSimilarity(textA: string, textB: string): number {
  const tfA = termFrequency(tokenize(textA));
  const tfB = termFrequency(tokenize(textB));
  if (tfA.size === 0 || tfB.size === 0) return 0;

  let dot = 0;
  for (const [term, freqA] of tfA) {
    const freqB = tfB.get(term);
    if (freqB) dot += freqA * freqB;
  }

  const normA = Math.sqrt([...tfA.values()].reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt([...tfB.values()].reduce((s, v) => s + v * v, 0));
  if (normA === 0 || normB === 0) return 0;

  return dot / (normA * normB);
}
