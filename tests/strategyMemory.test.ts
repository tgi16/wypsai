import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStrategyMemoryContext,
  mergeStrategyMemories,
  readStrategyMemories,
  strategyMemoryKey,
  writeStrategyMemories,
} from '../strategyMemory';

const memory = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  category: 'preference' as const,
  title: 'Answer style',
  detail: 'Give the recommendation first.',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
  ...overrides,
});

test('Strategy memory survives a local write and read', () => {
  const values = new Map<string, string>();
  writeStrategyMemories([memory()], 'owner', { write: (key, value) => values.set(key, value), broadcast: false });
  const saved = readStrategyMemories('owner', (key) => values.get(key) || null);

  assert.equal(saved.length, 1);
  assert.equal(saved[0].detail, 'Give the recommendation first.');
  assert.ok(values.has(strategyMemoryKey('owner')));
});

test('Strategy memory merge replaces an older duplicate title', () => {
  const merged = mergeStrategyMemories(
    [memory()],
    [memory({ id: 'm2', detail: 'Use concise Burmese.', updatedAt: '2026-08-29T00:00:00.000Z' })],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'm2');
});

test('Strategy memory context excludes invalid and oversized entries', () => {
  const context = buildStrategyMemoryContext(mergeStrategyMemories([
    memory(),
    memory({ id: 'bad', category: 'secret', title: 'Token', detail: 'do-not-store' }),
  ] as any));

  assert.match(context, /Answer style/);
  assert.doesNotMatch(context, /do-not-store/);
});

test('Strategy memory rejects secrets and contact details', () => {
  const merged = mergeStrategyMemories([
    memory({ id: 'secret', title: 'API key', detail: 'secret-123' }),
    memory({ id: 'phone', title: 'Contact', detail: 'Call 09123456789' }),
  ]);

  assert.equal(merged.length, 0);
});
