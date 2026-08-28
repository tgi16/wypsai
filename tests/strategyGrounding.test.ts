import test from 'node:test';
import assert from 'node:assert/strict';
import { appendStrategySources, extractStrategyWebSources } from '../strategyGrounding';

test('Strategy grounding extracts unique valid web sources and appends links', () => {
  const response = {
    candidates: [{
      groundingMetadata: {
        groundingChunks: [
          { web: { title: 'Official source', uri: 'https://example.com/current' } },
          { web: { title: 'Duplicate', uri: 'https://example.com/current' } },
          { web: { title: 'Unsafe', uri: 'javascript:alert(1)' } },
        ],
      },
    }],
  };
  const sources = extractStrategyWebSources(response);
  const text = appendStrategySources('Current answer.', sources);

  assert.equal(sources.length, 1);
  assert.match(text, /\*\*Web Sources\*\*/);
  assert.match(text, /https:\/\/example\.com\/current/);
  assert.doesNotMatch(text, /javascript:/);
});
