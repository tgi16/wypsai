import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
