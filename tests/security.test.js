import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeGeminiRequest, sanitizeGeminiRequest } from '../geminiGuard.js';
import facebookInsights from '../api/facebook-insights.js';
import facebookPost from '../api/facebook-post.js';
import facebookTokenCheck from '../api/facebook-token-check.js';
import tokenManager from '../api/token-manager.js';
import posBookings from '../api/pos-bookings.js';
import posPackages from '../api/pos-packages.js';

const createResponse = () => {
  const result = { statusCode: 200, body: null };
  return {
    result,
    setHeader() {},
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
};

test('owner API authorization rejects requests without a Firebase token', async () => {
  await assert.rejects(
    authorizeGeminiRequest({ headers: {} }),
    (error) => error.status === 401 && error.message === 'Authentication required',
  );
});

test('all sensitive API handlers reject anonymous POST requests', async () => {
  const handlers = [facebookInsights, facebookPost, facebookTokenCheck, tokenManager, posBookings, posPackages];
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const handler of handlers) {
      const response = createResponse();
      await handler({ method: 'POST', headers: {}, body: {} }, response);
      assert.equal(response.result.statusCode, 401);
      assert.equal(response.result.body?.error, 'Authentication required');
    }
  } finally {
    console.error = originalError;
  }
});

test('Gemini request sanitizer rejects unknown models and caps output tokens', () => {
  assert.throws(
    () => sanitizeGeminiRequest({ model: 'unknown-model', contents: { parts: [{ text: 'test' }] } }),
    /not allowed/,
  );

  const sanitized = sanitizeGeminiRequest({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: 'test' }] },
    config: { maxOutputTokens: 99_999, unsupported: true },
  });
  assert.equal(sanitized.config.maxOutputTokens, 8192);
  assert.equal('unsupported' in sanitized.config, false);
});

test('Gemini request sanitizer only allows the Google Search grounding tool', () => {
  const allowed = sanitizeGeminiRequest({
    model: 'gemini-2.5-pro',
    contents: { parts: [{ text: 'latest platform policy' }] },
    config: { tools: [{ googleSearch: {} }] },
  });
  assert.deepEqual(allowed.config.tools, [{ googleSearch: {} }]);

  const rejected = sanitizeGeminiRequest({
    model: 'gemini-2.5-pro',
    contents: { parts: [{ text: 'run a function' }] },
    config: { tools: [{ functionDeclarations: [{ name: 'dangerous' }] }] },
  });
  assert.deepEqual(rejected.config.tools, []);
});
