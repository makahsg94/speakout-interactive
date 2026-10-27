// Script to parse the syllabus from page 2 and create accurate unit/lesson page mapping

import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'D:/the pofitional book/src/assets/pdf-extracted';

// Exact page mapping from the syllabus on page 2
const unitLessonPages = {
  1: {
    title: 'me & mine',
    lessons: {
      A: { title: 'The story of me', page: 8 },
      B: { title: 'Less is more?', page: 11 },
      C: { title: "Don't forget to …", page: 14 },
      D: { title: 'Your gadgets', page: 16 },
      Review: { title: 'UNIT 1 REVIEW', page: 18 },
    },
    vlog: 'What\'s the best present you\'ve ever received?',
  },
  2: {
    title: 'behaviour',
    lessons: {
      A: { title: 'Change of habit', page: 20 },
      B: { title: 'People pleaser', page: 23 },
      C: { title: "That's annoying!", page: 26 },
      D: { title: 'Planet Earth II: Jungles', page: 28 },
      Review: { title: 'UNIT 2 REVIEW', page: 30 },
    },
    vlog: 'What good habits do you have?',
  },
  3: {
    title: 'working life',
    lessons: {
      A: { title: 'Working from home', page: 32 },
      B: { title: 'Gig work', page: 35 },
      C: { title: 'Good question', page: 38 },
      D: { title: 'This or that?', page: 40 },
      Review: { title: 'UNIT 3 REVIEW', page: 42 },
    },
    vlog: 'Where do you prefer to work or study?',
  },
  4: {
    title: 'fact or fiction?',
    lessons: {
      A: { title: 'Hoax!', page: 44 },
      B: { title: 'Documentary', page: 47 },
      C: { title: 'Great question', page: 50 },
      D: { title: 'True or false?', page: 52 },
      Review: { title: 'UNIT 4 REVIEW', page: 54 },
    },
    vlog: 'Do you prefer true stories or fiction?',
  },
  5: {
    title: 'the natural world',
    lessons: {
      A: { title: 'Extreme survival', page: 56 },
      B: { title: 'Animal talk', page: 59 },
      C: { title: 'Good question', page: 62 },
      D: { title: 'Planet Earth II: Islands', page: 64 },
      Review: { title: 'UNIT 5 REVIEW', page: 66 },
    },
    vlog: 'What\'s the most beautiful place you\'ve ever been?',
  },
  6: {
    title: 'the way we were',
    lessons: {
      A: { title: 'Childhood memories', page: 68 },
      B: { title: 'School days', page: 71 },
      C: { title: 'Good question', page: 74 },
      D: { title: 'Planet Earth II: Cities', page: 76 },
      Review: { title: 'UNIT 6 REVIEW', page: 78 },
    },
    vlog: 'What was your favourite game as a child?',
  },
  7: {
    title: 'the consumer society',
    lessons: {
      A: { title: 'Shop till you drop', page: 80 },
      B: { title: 'Ethical shopping', page: 83 },
      C: { title: 'Good question', page: 86 },
      D: { title: 'Planet Earth II: Grasslands', page: 88 },
      Review: { title: 'UNIT 7 REVIEW', page: 90 },
    },
    vlog: 'What\'s the best thing you\'ve ever bought?',
  },
  8: {
    title: 'the future',
    lessons: {
      A: { title: 'Future tech', page: 92 },
      B: { title: 'Space tourism', page: 95 },
      C: { title: 'Good question', page: 98 },
      D: { title: 'Planet Earth II: Deserts', page: 100 },
      Review: { title: 'UNIT 8 REVIEW', page: 102 },
    },
    vlog: 'What do you think the world will be like in 2050?',
  },
};

// Build unit page ranges
const unitPageRanges = Object.entries(unitLessonPages).map(([unitStr, unit]) => {
  const unitNum = parseInt(unitStr);
  const lessonPages = Object.entries(unit.lessons).map(([lesson, data]) => ({
    lesson,
    title: data.title,
    page: data.page,
  }));
  
  const startPage = lessonPages[0].page;
  const endPage = lessonPages[lessonPages.length - 1].page;
  
  return {
    unit: unitNum,
    title: unit.title,
    startPage,
    endPage,
    lessons: lessonPages.map(lp => ({
      lesson: lp.lesson,
      title: lp.title,
      startPage: lp.page,
      endPage: lp.page, // Each lesson is typically 2-3 pages
    })),
    vlog: unit.vlog,
  };
});

// Read existing extracted data
const pageTexts = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'page-texts.json'), 'utf-8'));
const searchIndex = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'search-index.json'), 'utf-8'));
const outline = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'outline.json'), 'utf-8'));

// Create accurate manifest
const result = {
  totalPages: 136,
  outline,
  unitPageRanges,
  pageTexts,
  searchIndex,
  extractedAt: new Date().toISOString(),
};

// Save updated files
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'unit-ranges.json'),
  JSON.stringify(unitPageRanges, null, 2)
);

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'full-content.json'),
  JSON.stringify(result, null, 2)
);

// Generate TypeScript manifest
const tsManifest = `// Auto-generated PDF manifest
// Generated at: ${result.extractedAt}
// Total pages: ${result.totalPages}
// Source: Syllabus page 2 of Speakout 3rd Edition B1+

export interface LessonPageRange {
  lesson: string;
  title: string;
  startPage: number;
  endPage: number;
}

export interface UnitPageRange {
  unit: number;
  title: string;
  startPage: number;
  endPage: number;
  lessons: LessonPageRange[];
  vlog?: string;
}

export const pdfManifest = {
  totalPages: ${result.totalPages},
  unitPageRanges: ${JSON.stringify(unitPageRanges, null, 2)},
  outline: ${JSON.stringify(outline, null, 2)},
} as const;

export const pageTexts = ${JSON.stringify(pageTexts, null, 2)} as const;

export const searchIndex = ${JSON.stringify(searchIndex, null, 2)} as const;
`;

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'pdf-manifest.ts'),
  tsManifest
);

console.log('✅ Accurate unit/lesson mapping created!');
console.log('\n📊 Unit Page Ranges (from syllabus):');
for (const unit of unitPageRanges) {
  console.log(`  Unit ${unit.unit}: "${unit.title}" - Pages ${unit.startPage}-${unit.endPage} (Vlog: ${unit.vlog})`);
  for (const lesson of unit.lessons) {
    console.log(`    Lesson ${lesson.lesson}: "${lesson.title}" - Page ${lesson.startPage}`);
  }
}