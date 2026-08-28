import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMoodboardStoryBookSource,
  buildStrategyStoryBookSource,
  normalizeStoryBookProject,
  readStoryBooks,
  STORY_BOOK_LOCAL_KEY,
  StoryBookProject,
  stripStoryBookTransientData,
  upsertStoryBook,
} from '../storyBook';

test('Story Book source builders preserve Moodboard ideas and Strategy request context', () => {
  const moodboard = buildMoodboardStoryBookSource('Outdoor sunset', 'Use mountain light and natural poses');
  assert.match(moodboard, /Customer vibe:\nOutdoor sunset/);
  assert.match(moodboard, /Moodboard & Concept recommendation:\nUse mountain light/);

  const strategy = buildStrategyStoryBookSource('Launch the smaller package first', 'Which package should I launch?');
  assert.match(strategy, /Owner request:\nWhich package should I launch\?/);
  assert.match(strategy, /Strategy Partner recommendation:\nLaunch the smaller package first/);
});

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { dispatchEvent: () => true },
});
Object.defineProperty(globalThis, 'CustomEvent', {
  configurable: true,
  value: class CustomEvent { constructor(public type: string, public init?: unknown) {} },
});

const project = (): StoryBookProject => ({
  id: 'story-1',
  title: 'Outdoor Story',
  subtitle: 'A coherent visual plan',
  source: 'Outdoor pre-wedding idea with mountain light',
  sourceLabel: 'Moodboard result',
  sourceType: 'moodboard' as const,
  bookType: 'visual-concept' as const,
  visualStyle: 'cinematic' as const,
  styleBible: 'Cool mountain palette and natural late-afternoon light.',
  pageCount: 6 as const,
  pages: Array.from({ length: 6 }, (_, index) => ({
    id: `page-${index + 1}`,
    order: index,
    title: `Page ${index + 1}`,
    narrative: 'Short page story.',
    visualPrompt: 'Outdoor couple portrait with visible mountain environment.',
    shotNote: 'Keep the scene outdoors.',
    imageDataUrl: 'data:image/png;base64,very-large-transient-data',
    imageStatus: 'ready' as const,
  })),
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T01:00:00.000Z',
  syncStatus: 'device' as const,
});

test('Story Book normalization keeps a valid six-page visual plan', () => {
  const normalized = normalizeStoryBookProject(project());
  assert.equal(normalized?.pages.length, 6);
  assert.equal(normalized?.pages[0].title, 'Page 1');
  assert.match(normalized?.source || '', /Outdoor/);
});

test('Story Book normalization preserves the black-and-white shoot sketch type', () => {
  const sketchProject = project();
  sketchProject.bookType = 'shoot-sketch';
  sketchProject.visualStyle = 'illustrated';
  const normalized = normalizeStoryBookProject(sketchProject);
  assert.equal(normalized?.bookType, 'shoot-sketch');
  assert.equal(normalized?.visualStyle, 'illustrated');
});

test('Story Book persistence strips generated base64 images from localStorage', () => {
  values.clear();
  upsertStoryBook(project());
  const raw = values.get(STORY_BOOK_LOCAL_KEY) || '';
  assert.doesNotMatch(raw, /very-large-transient-data/);
  assert.equal(readStoryBooks().length, 1);
});

test('Story Book transient stripper preserves cloud image URLs', () => {
  const withCloud = project();
  withCloud.pages[0].imageUrl = 'https://storage.example/page-1.png';
  const stripped = stripStoryBookTransientData(withCloud);
  assert.equal(stripped.pages[0].imageDataUrl, undefined);
  assert.equal(stripped.pages[0].imageUrl, 'https://storage.example/page-1.png');
});
