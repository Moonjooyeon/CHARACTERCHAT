import type { Work } from './data';

// Authored character identities, not audience labels: Han Seoin is a woman.
// Interleave quieter and more expressive existing covers, keeping every work.
// This is the default editorial shelf, never a popularity or freshness signal.
export const discoveryOrder = [
  'sample-female-quiet-bookbinder', 'sample-cold-editor',
  'sample-female-unreleased-track', 'sample-silver', 'sample-female-frail-cartographer',
  'sample-female-anonymous-credit', 'sample-female-seasonal-engagement',
  'sample-dragon', 'sample-female-midnight-postscript', 'sample-sori',
  'sample-female-forgetful-spring', 'sample-warm',
  'sample-female-unwritten-constellation', 'sample-succubus', 'sample-female-dual-return-order',
  'sample-suit', 'sample-female-storm-return-map', 'sample-violet', 'sample-deer', 'sample-slime',
  'sample-gumiho', 'sample-crow', 'sample-muse', 'sample-whitesnake', 'sample-ruby',
  'sample-dokkaebi', 'sample-serpent', 'sample-female-final-curtain-bet', 'sample-ram-demon',
] as const;

export function discoveryPosition(work: Work, catalog: Work[]): number {
  const index = discoveryOrder.indexOf(work.id as typeof discoveryOrder[number]);
  return index < 0 ? discoveryOrder.length + catalog.indexOf(work) : index;
}

// Keep saved taste signals first; the mixed shelf breaks equal-score ties.
export function compareRecommendations(a: Work, b: Work, catalog: Work[], activity: Map<string, { turns?: number }>, genreScore: Map<string, number>): number {
  const score = (work: Work) => (activity.get(work.id)?.turns || 0) * 2 + (genreScore.get(work.tag) || 0);
  return score(b) - score(a) || discoveryPosition(a, catalog) - discoveryPosition(b, catalog);
}
