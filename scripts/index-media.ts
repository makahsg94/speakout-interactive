// Script to index audio and video files from the actual folders

import fs from 'fs';
import path from 'path';

const AUDIO_ROOT = 'D:/the pofitional book/688_3- Speakout 3rd B1+ Class Audio/688_3- Speakout 3rd B1+ Class Audio';
const VIDEO_ROOT = 'D:/the pofitional book/688_4- Speakout 3rd B1+ Video/688_4- Speakout 3rd B1+ Video';

interface AudioFile {
  id: string;
  editionId: string;
  unitId: string;
  lessonId?: string;
  pageId?: string;
  title: string;
  filename: string;
  path: string;
  duration?: number;
  type: 'dialogue' | 'vocabulary' | 'pronunciation' | 'listening' | 'review' | 'other';
  transcriptId?: string;
}

interface VideoFile {
  id: string;
  editionId: string;
  unitId: string;
  lessonId?: string;
  pageId?: string;
  title: string;
  filename: string;
  path: string;
  duration?: number;
  type: 'bbc-programme' | 'bbc-vlog' | 'street-interview' | 'other';
  thumbnailPath?: string;
  transcriptId?: string;
  externalUrl?: string;
  embeddable: boolean;
}

function parseAudioFilename(filename: string, unitNum: number, lessonFolder: string): Partial<AudioFile> {
  // Format: SO3_B1+_SB_1A_Audio_1_01.mp3
  // or: SO3_B1+_SB_1R_Audio_R1_01.mp3
  const match = filename.match(/SO3_B1\+_SB_(\d+)([A-R])?_Audio_([A-Z]?\d+)_(\d+)\.mp3/i);
  
  if (!match) return {};
  
  const [, unitStr, lessonLetter, audioType, trackNum] = match;
  const unit = parseInt(unitStr);
  
  let type: AudioFile['type'] = 'other';
  let title = `Unit ${unit} Audio ${trackNum}`;
  
  if (lessonLetter) {
    const lessonMap: Record<string, { type: AudioFile['type']; title: string }> = {
      'A': { type: 'vocabulary', title: `Unit ${unit} Lesson A: Vocabulary` },
      'B': { type: 'grammar', title: `Unit ${unit} Lesson B: Grammar` },
      'C': { type: 'listening', title: `Unit ${unit} Lesson C: Listening` },
      'D': { type: 'dialogue', title: `Unit ${unit} Lesson D: Speaking` },
      'R': { type: 'review', title: `Unit ${unit} Review` },
    };
    const info = lessonMap[lessonLetter];
    if (info) {
      type = info.type;
      title = info.title;
    }
  } else if (audioType.startsWith('R')) {
    type = 'review';
    title = `Unit ${unit} Review`;
  } else if (audioType.startsWith('MB')) {
    type = 'pronunciation';
    title = `Unit ${unit} Pronunciation`;
  } else if (audioType.startsWith('VB')) {
    type = 'vocabulary';
    title = `Unit ${unit} Vocabulary Bank`;
  }
  
  return { type, title };
}

function parseVideoFilename(filename: string): Partial<VideoFile> {
  // Format: SO3 B1+ U1 BBC Vlogs.mp4
  // or: SO3_B1+_U5_BBC_Street_Interviews_Video.mp4
  const match = filename.match(/SO3\s*B1\+\s*U(\d+)\s*BBC\s*(.+?)(?:\.mp4)/i);
  
  if (!match) return {};
  
  const [, unitStr, videoType] = match;
  const unit = parseInt(unitStr);
  
  let type: VideoFile['type'] = 'other';
  let title = `Unit ${unit} BBC Video`;
  
  const cleanType = videoType.trim().replace(/_/g, ' ').replace(/Video$/i, '').trim();
  
  if (cleanType.toLowerCase().includes('vlog')) {
    type = 'bbc-vlog';
    title = `Unit ${unit} BBC Vlog: ${cleanType}`;
  } else if (cleanType.toLowerCase().includes('street')) {
    type = 'street-interview';
    title = `Unit ${unit} BBC Street Interviews`;
  } else if (cleanType.toLowerCase().includes('programme')) {
    type = 'bbc-programme';
    title = `Unit ${unit} BBC Programme: ${cleanType.replace(/Programme/i, '').trim()}`;
  } else {
    title = `Unit ${unit} BBC ${cleanType}`;
  }
  
  return { type, title };
}

function scanAudioFiles(): AudioFile[] {
  const audioFiles: AudioFile[] = [];
  
  if (!fs.existsSync(AUDIO_ROOT)) {
    console.log('Audio root not found:', AUDIO_ROOT);
    return audioFiles;
  }
  
  const unitFolders = fs.readdirSync(AUDIO_ROOT).filter(f => f.startsWith('Speakout_B1P_SB_Unit_'));
  
  for (const unitFolder of unitFolders) {
    const unitMatch = unitFolder.match(/Unit_(\d+)/);
    if (!unitMatch) continue;
    const unitNum = parseInt(unitMatch[1]);
    const unitId = `unit-${unitNum}`;
    
    const unitPath = path.join(AUDIO_ROOT, unitFolder);
    const files = fs.readdirSync(unitPath).filter(f => f.endsWith('.mp3'));
    
    for (const file of files) {
      const parsed = parseAudioFilename(file, unitNum, unitFolder);
      const lessonLetterMatch = file.match(/_SB_(\d+)([A-R])/i);
      const lessonLetter = lessonLetterMatch ? lessonLetterMatch[2] : undefined;
      const lessonId = lessonLetter ? `${unitId}-lesson-${lessonLetter.toLowerCase()}` : undefined;
      
      audioFiles.push({
        id: `audio-${unitNum}-${file.replace('.mp3', '')}`,
        editionId: 'speakout-b1p-3rd',
        unitId,
        lessonId,
        title: parsed.title || `Unit ${unitNum} Audio`,
        filename: file,
        path: `/audio/${unitFolder}/${file}`,
        type: parsed.type || 'other',
      });
    }
  }
  
  return audioFiles;
}

function scanVideoFiles(): VideoFile[] {
  const videoFiles: VideoFile[] = [];
  
  if (!fs.existsSync(VIDEO_ROOT)) {
    console.log('Video root not found:', VIDEO_ROOT);
    return videoFiles;
  }
  
  const files = fs.readdirSync(VIDEO_ROOT).filter(f => f.endsWith('.mp4'));
  
  for (const file of files) {
    const parsed = parseVideoFilename(file);
    const unitMatch = file.match(/U(\d+)/i);
    const unitNum = unitMatch ? parseInt(unitMatch[1]) : 1;
    const unitId = `unit-${unitNum}`;
    
    videoFiles.push({
      id: `video-${unitNum}-${file.replace('.mp4', '').replace(/\s+/g, '-')}`,
      editionId: 'speakout-b1p-3rd',
      unitId,
      title: parsed.title || `Unit ${unitNum} Video`,
      filename: file,
      path: `/video/${file}`,
      type: parsed.type || 'other',
      embeddable: true,
    });
  }
  
  return videoFiles;
}

// Run the scan
console.log('Scanning audio files...');
const audioFiles = scanAudioFiles();
console.log(`Found ${audioFiles.length} audio files`);

console.log('\nScanning video files...');
const videoFiles = scanVideoFiles();
console.log(`Found ${videoFiles.length} video files`);

// Group by unit
console.log('\n--- Audio by Unit ---');
const audioByUnit = audioFiles.reduce((acc, f) => {
  if (!acc[f.unitId]) acc[f.unitId] = [];
  acc[f.unitId].push(f);
  return acc;
}, {} as Record<string, AudioFile[]>);

Object.entries(audioByUnit).forEach(([unit, files]) => {
  console.log(`${unit}: ${files.length} files`);
  files.forEach(f => console.log(`  - ${f.title} (${f.type})`));
});

console.log('\n--- Video by Unit ---');
const videoByUnit = videoFiles.reduce((acc, f) => {
  if (!acc[f.unitId]) acc[f.unitId] = [];
  acc[f.unitId].push(f);
  return acc;
}, {} as Record<string, VideoFile[]>);

Object.entries(videoByUnit).forEach(([unit, files]) => {
  console.log(`${unit}: ${files.length} files`);
  files.forEach(f => console.log(`  - ${f.title} (${f.type})`));
});

// Generate manifest JSON
const manifest = {
  version: '1.0',
  editionId: 'speakout-b1p-3rd',
  audioFiles,
  videoFiles,
  generatedAt: new Date().toISOString(),
};

const outputPath = 'D:/the pofitional book/src/assets/media-manifest.json';
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`\nManifest saved to: ${outputPath}`);

// Also generate TypeScript importable version
const tsOutput = `// Auto-generated media manifest
// Generated at: ${new Date().toISOString()}

import type { AudioFile, VideoFile } from '@/types';

export const audioFiles: AudioFile[] = ${JSON.stringify(audioFiles, null, 2)};

export const videoFiles: VideoFile[] = ${JSON.stringify(videoFiles, null, 2)};
`;

fs.writeFileSync('D:/the pofitional book/src/assets/media-manifest.ts', tsOutput);
console.log(`TypeScript manifest saved to: src/assets/media-manifest.ts`);