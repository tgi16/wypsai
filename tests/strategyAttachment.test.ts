import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_STRATEGY_FILE_BYTES, validateStrategyAttachment } from '../strategyAttachment';

test('Strategy attachments accept supported image and document types', () => {
  assert.equal(validateStrategyAttachment({ name: 'photo.jpg', type: 'image/jpeg', size: 2_000_000 } as File), '');
  assert.equal(validateStrategyAttachment({ name: 'brief.pdf', type: 'application/pdf', size: MAX_STRATEGY_FILE_BYTES } as File), '');
});

test('Strategy attachments reject unsupported or oversized files', () => {
  assert.match(validateStrategyAttachment({ name: 'archive.zip', type: 'application/zip', size: 100 } as File), /JPG/);
  assert.match(validateStrategyAttachment({ name: 'brief.pdf', type: 'application/pdf', size: MAX_STRATEGY_FILE_BYTES + 1 } as File), /2\.5MB/);
});
