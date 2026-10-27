// Script to extract PDF content: TOC, page mapping, text extraction
// Run with: npx tsx scripts/extract-pdf-content.ts

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

const PDF_PATH = 'D:/the pofitional book/public/speakout-b1p.pdf';
const OUTPUT_DIR = 'D:/the pofitional book/src/assets/pdf-extracted';

interface PageText {
  pageNumber: number;
  text: string;
  items: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontName: string;
  }>;
}

interface UnitPageRange {
  unit: number;
  title: string;
  startPage: number;
  endPage: number;
  lessons: LessonPageRange[];
}

interface LessonPageRange {
  lesson: string; // A, B, C, D
  title: string;
  startPage: number;
  endPage: number;
}

interface ExtractedContent {
  totalPages: number;
  outline: any[];
  unitPageRanges: UnitPageRange[];
  pageTexts: PageText[];
  searchIndex: Record<string, number[]>;
  extractedAt: string;
}

async function extractPDF() {
  console.log('📖 Loading PDF...');
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  
  console.log(`📄 Total pages: ${pdf.numPages}`);
  
  // Extract outline (table of contents)
  console.log('📑 Extracting outline...');
  const outline = await pdf.getOutline() || [];
  console.log('Outline items:', outline.length);
  
  // Extract text from all pages
  console.log('📝 Extracting text from all pages...');
  const pageTexts: PageText[] = [];
  const searchIndex: Record<string, number[]> = {};
  
  for (let i = 1; i <= pdf.numPages; i++) {
    if (i % 20 === 0) console.log(`  Page ${i}/${pdf.numPages}...`);
    
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const items = textContent.items.map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height,
      fontSize: Math.sqrt(item.transform[0] ** 2 + item.transform[1] ** 2),
      fontName: item.fontName,
    }));
    
    const text = items.map(i => i.str).join(' ');
    pageTexts.push({ pageNumber: i, text, items });
    
    // Build search index (simplified)
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    for (const word of words) {
      if (!searchIndex[word]) searchIndex[word] = [];
      if (!searchIndex[word].includes(i)) searchIndex[word].push(i);
    }
  }
  
  // Try to detect unit/lesson structure from text
  console.log('🔍 Detecting unit/lesson structure...');
  const unitPageRanges = detectUnitsAndLessons(pageTexts, pdf.numPages);
  
  // Save results
  console.log('💾 Saving extracted content...');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const result: ExtractedContent = {
    totalPages: pdf.numPages,
    outline,
    unitPageRanges,
    pageTexts,
    searchIndex,
    extractedAt: new Date().toISOString(),
  };
  
  // Save full data (might be large)
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'full-content.json'),
    JSON.stringify(result, null, 2)
  );
  
  // Save lighter versions
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'page-texts.json'),
    JSON.stringify(pageTexts.map(p => ({ pageNumber: p.pageNumber, text: p.text })), null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'unit-ranges.json'),
    JSON.stringify(unitPageRanges, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'search-index.json'),
    JSON.stringify(searchIndex, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'outline.json'),
    JSON.stringify(outline, null, 2)
  );
  
  // Generate TypeScript manifest
  const tsManifest = generateTSManifest(result);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'pdf-manifest.ts'),
    tsManifest
  );
  
  console.log('\n✅ Extraction complete!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`📄 Files created:`);
  console.log(`   - full-content.json (full data)`);
  console.log(`   - page-texts.json (page text only)`);
  console.log(`   - unit-ranges.json (unit/lesson page mapping)`);
  console.log(`   - search-index.json (word -> pages)`);
  console.log(`   - outline.json (PDF bookmarks)`);
  console.log(`   - pdf-manifest.ts (TypeScript import)`);
  
  // Print summary
  console.log('\n📊 Unit Page Ranges:');
  for (const unit of unitPageRanges) {
    console.log(`  Unit ${unit.unit}: "${unit.title}" - Pages ${unit.startPage}-${unit.endPage}`);
    for (const lesson of unit.lessons) {
      console.log(`    Lesson ${lesson.lesson}: "${lesson.title}" - Pages ${lesson.startPage}-${lesson.endPage}`);
    }
  }
  
  return result;
}

function detectUnitsAndLessons(pageTexts: PageText[], totalPages: number): UnitPageRange[] {
  const units: UnitPageRange[] = [];
  let currentUnit: UnitPageRange | null = null;
  let currentLesson: LessonPageRange | null = null;
  
  // Patterns to detect units and lessons
  const unitPattern = /^unit\s+(\d+)[\s:.-]+(.+)$/i;
  const lessonPattern = /^lesson\s+([a-d])[\s:.-]+(.+)$/i;
  const unitHeaderPattern = /^unit\s+(\d+)$/i;
  const lessonHeaderPattern = /^lesson\s+([a-d])$/i;
  
  for (const page of pageTexts) {
    const lines = page.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    for (const line of lines.slice(0, 10)) { // Check first 10 lines
      // Check for unit header
      const unitMatch = line.match(unitPattern) || line.match(unitHeaderPattern);
      if (unitMatch) {
        const unitNum = parseInt(unitMatch[1]);
        const title = unitMatch[2] || `Unit ${unitNum}`;
        
        if (currentUnit) {
          if (currentLesson) {
            currentLesson.endPage = page.pageNumber - 1;
            currentUnit.lessons.push(currentLesson);
            currentLesson = null;
          }
          currentUnit.endPage = page.pageNumber - 1;
          units.push(currentUnit);
        }
        
        currentUnit = {
          unit: unitNum,
          title: title.trim(),
          startPage: page.pageNumber,
          endPage: totalPages, // Will update
          lessons: [],
        };
        continue;
      }
      
      // Check for lesson header
      const lessonMatch = line.match(lessonPattern) || line.match(lessonHeaderPattern);
      if (lessonMatch && currentUnit) {
        const lessonLetter = lessonMatch[1].toUpperCase();
        const title = lessonMatch[2] || `Lesson ${lessonLetter}`;
        
        if (currentLesson) {
          currentLesson.endPage = page.pageNumber - 1;
          currentUnit.lessons.push(currentLesson);
        }
        
        currentLesson = {
          lesson: lessonLetter,
          title: title.trim(),
          startPage: page.pageNumber,
          endPage: currentUnit.endPage, // Will update
        };
      }
    }
  }
  
  // Close last unit/lesson
  if (currentUnit) {
    if (currentLesson) {
      currentLesson.endPage = pageTexts[pageTexts.length - 1].pageNumber;
      currentUnit.lessons.push(currentLesson);
    }
    currentUnit.endPage = pageTexts[pageTexts.length - 1].pageNumber;
    units.push(currentUnit);
  }
  
  // If no units detected, create default based on page count
  if (units.length === 0) {
    console.log('⚠️ No units detected from text, creating default 8-unit structure');
    const pagesPerUnit = Math.ceil(pageTexts.length / 8);
    for (let i = 1; i <= 8; i++) {
      const start = (i - 1) * pagesPerUnit + 1;
      const end = Math.min(i * pagesPerUnit, pageTexts.length);
      units.push({
        unit: i,
        title: `Unit ${i}`,
        startPage: start,
        endPage: end,
        lessons: [
          { lesson: 'A', title: 'Vocabulary', startPage: start, endPage: start + Math.floor(pagesPerUnit/4) - 1 },
          { lesson: 'B', title: 'Grammar', startPage: start + Math.floor(pagesPerUnit/4), endPage: start + Math.floor(pagesPerUnit/2) - 1 },
          { lesson: 'C', title: 'Reading/Listening', startPage: start + Math.floor(pagesPerUnit/2), endPage: start + Math.floor(3*pagesPerUnit/4) - 1 },
          { lesson: 'D', title: 'Speaking/Writing', startPage: start + Math.floor(3*pagesPerUnit/4), endPage: end },
        ],
      });
    }
  }
  
  return units;
}

function generateTSManifest(result: ExtractedContent): string {
  return `// Auto-generated PDF manifest
// Generated at: ${result.extractedAt}
// Total pages: ${result.totalPages}

export interface PageText {
  pageNumber: number;
  text: string;
}

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
}

export const pdfManifest = {
  totalPages: ${result.totalPages},
  unitPageRanges: ${JSON.stringify(result.unitPageRanges, null, 2)},
  outline: ${JSON.stringify(result.outline, null, 2)},
} as const;

export const pageTexts: PageText[] = ${JSON.stringify(
    result.pageTexts.map(p => ({ pageNumber: p.pageNumber, text: p.text })),
    null,
    2
  )};

export const searchIndex: Record<string, number[]> = ${JSON.stringify(result.searchIndex, null, 2)};
`;
}

// Run extraction
extractPDF().catch(console.error);