import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDomain } from '../src/domain.js';

test('领域样例字段完整', async () => {
  const raw = await readFile(new URL('../fixtures/domain.json', import.meta.url), 'utf8');
  const value = parseDomain(raw);
  assert.equal(value.domain, 'crossborder-partner-match');
  assert.ok(value.workflow_states.length >= 3);
  assert.ok(value.rules.length >= 3);
});

test('协作规则覆盖关键业务约束', async () => {
  const raw = await readFile(new URL('../fixtures/domain.json', import.meta.url), 'utf8');
  const value = parseDomain(raw);
  assert.ok(value.record_types.includes('联系人开放记录'));
  assert.ok(value.record_types.includes('记录修订'));
  assert.ok(value.record_types.includes('双方确认'));
  assert.ok(value.record_types.includes('供需缺口'));
  assert.ok(value.workflow_states.includes('联系人已开放'));
  assert.ok(value.workflow_states.includes('保密已生效'));
  assert.ok(value.workflow_states.includes('未成交'));
  assert.ok(value.rules.some((rule) => rule.includes('不覆盖')));
  assert.ok(value.rules.some((rule) => rule.includes('双方分别确认')));
  assert.ok(value.rules.some((rule) => rule.includes('保密协议生效')));
});
