import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  parseDomain,
  validateDomain,
  checkGates,
  checkAmendments,
  checkConfirmations,
  checkGapSummaries,
} from '../src/domain.js';

const FIXTURE = new URL('../fixtures/domain.json', import.meta.url);

async function loadDomain() {
  const raw = await readFile(FIXTURE, 'utf8');
  return parseDomain(raw);
}

test('领域样例字段完整', async () => {
  const raw = await readFile(FIXTURE, 'utf8');
  const value = parseDomain(raw);
  assert.equal(value.domain, 'crossborder-partner-match');
  assert.ok(value.workflow_states.length >= 3);
});

test('领域资料覆盖修订原因与新增记录类型', async () => {
  const value = await loadDomain();
  for (const cause of ['翻译更正', '需求改变', '机构重复报名', '代表离职', '纪要分歧']) {
    assert.ok(value.amendment_causes.includes(cause), `缺少修订原因：${cause}`);
  }
  for (const type of ['披露授权', '修订记录', '双方确认', '供需缺口']) {
    assert.ok(value.record_types.includes(type), `缺少记录类型：${type}`);
  }
});

test('企业档案约定自述五要素', async () => {
  const value = await loadDomain();
  assert.equal(Object.keys(value.profile_fields).length, 5);
});

test('领域样例遵守对接规则', async () => {
  const raw = await readFile(FIXTURE, 'utf8');
  const value = validateDomain(raw);
  for (const key of ['profiles', 'matching', 'nda', 'amendments', 'milestones', 'progress_evidence', 'gap_summaries']) {
    assert.ok(value.sample[key] !== undefined, `样例缺少 ${key}`);
  }
});

test('必要条件未相互满足不得开放联系人', async () => {
  const tampered = structuredClone(await loadDomain());
  tampered.sample.matching.mutually_satisfied = false;
  assert.throws(() => checkGates(tampered), /不得开放联系人/);
});

test('保密协议未生效不得交换技术细节', async () => {
  const tampered = structuredClone(await loadDomain());
  tampered.sample.nda.status = '待签署';
  assert.throws(() => checkGates(tampered), /保密协议未生效/);
});

test('修订不得覆盖原记录', async () => {
  const tampered = structuredClone(await loadDomain());
  tampered.sample.amendments[0].kept_original = false;
  assert.throws(() => checkAmendments(tampered), /不得覆盖/);
});

test('里程碑须双方分别确认才算完成', async () => {
  const tampered = structuredClone(await loadDomain());
  tampered.sample.milestones[1].complete = true;
  assert.throws(() => checkConfirmations(tampered), /双方确认不一致/);
});

test('供需缺口不得点名企业', async () => {
  const tampered = structuredClone(await loadDomain());
  tampered.sample.gap_summaries[0].need = '英国食品企业样例的产线细节';
  assert.throws(() => checkGapSummaries(tampered), /不得点名企业/);
});
