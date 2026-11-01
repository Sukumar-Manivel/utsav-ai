import test from 'node:test';
import assert from 'node:assert/strict';
import { __test } from '../lib/ai.js';

test('Gemini calls skip a model whose quota is used up and use the next one', async () => {
  const calls = [];
  __test.setClient({ models: { generateContent: async ({ model }) => {
    calls.push(model);
    if (model === 'gemini-2.5-flash') throw new Error('{"error":{"code":429,"message":"Quota exceeded. Please retry in 1h55m41.6s.","status":"RESOURCE_EXHAUSTED"}}');
    if (model === 'gemini-3.7-flash') throw new Error('{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}');
    return { text: `ok from ${model}` };
  } } });
  assert.equal(await __test.askText('hi'), 'ok from gemini-3.6-flash');
  calls.length = 0;
  assert.equal(await __test.askText('again'), 'ok from gemini-3.6-flash');
  assert.ok(!calls.includes('gemini-2.5-flash'), 'model with used-up quota is skipped');
});
