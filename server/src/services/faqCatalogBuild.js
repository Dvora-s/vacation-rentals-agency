import { FAQ_SEED_ROWS } from '../data/faqSeed.js';

const SECTION_ORDER = ['renters', 'hosts'];

const SECTION_META = {
  renters: {
    id: 'renters',
    icon: '🏠',
    title: 'שאלות נפוצות – למחפשי דירות (שוכרים)',
  },
  hosts: {
    id: 'hosts',
    icon: '🔑',
    title: 'שאלות נפוצות – למפרסמי דירות (מארחים)',
  },
};

export function buildFaqSectionsFromRows(rows) {
  return SECTION_ORDER.map((key) => ({
    ...SECTION_META[key],
    items: rows
      .filter((r) => r.section === key)
      .map((r) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
      })),
  }));
}

/** גיבוי כשהמסד ריק */
export function buildSeedFaqResponse() {
  const rows = FAQ_SEED_ROWS.map((row, index) => ({
    id: `seed-${index}`,
    section: row.section,
    question: row.question,
    answer: row.answer,
    sort_order: row.sort_order,
  }));
  return { sections: buildFaqSectionsFromRows(rows) };
}
