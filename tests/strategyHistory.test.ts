import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStrategyModelHistory,
  mergeStrategyMessages,
  readStrategyHistory,
  strategyHistoryKey,
  writeStrategyHistory,
} from '../strategyHistory';

test('Strategy history survives a write and refresh-style read', () => {
  const storage = new Map<string, string>();
  const messages = [
    { id: '100-user', role: 'user' as const, content: 'Package ကို ဘယ်လိုပြင်ရမလဲ' },
    { id: '101-model', role: 'model' as const, content: 'အချက်သုံးချက်နဲ့ စလိုက်ပါမယ်။' },
  ];

  writeStrategyHistory(messages, null, (key, value) => storage.set(key, value));
  const restored = readStrategyHistory(null, (key) => storage.get(key) || null);

  assert.deepEqual(restored, messages);
  assert.ok(storage.has(strategyHistoryKey()));
});

test('Strategy history merge keeps order and removes duplicate cloud/local messages', () => {
  const first = { id: '100-user', role: 'user' as const, content: 'Question' };
  const second = { id: '101-model', role: 'model' as const, content: 'Answer' };
  const merged = mergeStrategyMessages([first], [first, second]);

  assert.deepEqual(merged, [first, second]);
});

test('Strategy history ignores invalid stored entries', () => {
  const restored = readStrategyHistory('owner', () => JSON.stringify([
    { id: 'valid', role: 'user', content: 'Keep me' },
    { id: 'invalid-role', role: 'admin', content: 'Drop me' },
    { id: 'empty', role: 'model', content: '' },
  ]));

  assert.deepEqual(restored, [{ id: 'valid', role: 'user', content: 'Keep me' }]);
});

test('Strategy history storage failures do not stop chat submission', () => {
  const message = { id: '100-user', role: 'user' as const, content: 'Keep the UI responsive' };

  assert.doesNotThrow(() => writeStrategyHistory([message], null, () => {
    throw new Error('Storage quota exceeded');
  }));
});

test('Strategy model history keeps newest context within a safe character budget', () => {
  const messages = [
    { id: '1', role: 'user' as const, content: 'a'.repeat(60) },
    { id: '2', role: 'model' as const, content: 'b'.repeat(60) },
    { id: '3', role: 'user' as const, content: 'latest question' },
  ];
  const history = buildStrategyModelHistory(messages, 80);

  assert.equal(history.length, 1);
  assert.equal(history[0].role, 'user');
  assert.equal(history[0].parts[0].text, 'latest question');
});
