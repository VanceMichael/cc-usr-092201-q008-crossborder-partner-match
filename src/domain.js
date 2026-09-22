// 读取并检查项目共享的领域资料。
export function parseDomain(raw) {
  const value = JSON.parse(raw);
  const complete = value.domain && value.version >= 2 && value.sample_id
    && Array.isArray(value.record_types) && value.record_types.length >= 3
    && Array.isArray(value.workflow_states) && value.workflow_states.length >= 3
    && value.profile_fields && value.matching_policy
    && Array.isArray(value.amendment_causes) && value.amendment_rule
    && value.confirmation_rule
    && Array.isArray(value.milestone_categories)
    && Array.isArray(value.progress_evidence)
    && Array.isArray(value.gap_reasons) && value.gap_rule
    && Array.isArray(value.facts) && value.facts.length >= 2
    && value.sample;
  if (!complete) throw new Error('领域资料缺少必要内容');
  return value;
}

// 企业档案须说清自身能力、待解决问题、合规边界、允许披露的材料及合作方式。
export function checkProfiles(domain) {
  const fields = Object.keys(domain.profile_fields);
  for (const profile of domain.sample.profiles ?? []) {
    for (const field of fields) {
      const item = profile[field];
      if (item === undefined || item === '' || (Array.isArray(item) && item.length === 0)) {
        throw new Error(`企业档案缺少「${domain.profile_fields[field]}」：${profile.party ?? '未知企业'}`);
      }
    }
  }
  return true;
}

// 必要条件相互满足才开放联系人，保密协议生效才交换技术细节。
export function checkGates(domain) {
  const { matching = {}, nda = {} } = domain.sample;
  const satisfied = matching.satisfied ?? [];
  const needed = domain.matching_policy.necessary_conditions ?? [];
  if (matching.mutually_satisfied && !needed.every((item) => satisfied.includes(item))) {
    throw new Error('标记为相互满足，但必要条件未全部满足');
  }
  if (matching.contact_released && !matching.mutually_satisfied) {
    throw new Error('必要条件未相互满足，不得开放联系人');
  }
  if (nda.technical_details_exchanged && nda.status !== '已生效') {
    throw new Error('保密协议未生效，不得交换技术细节');
  }
  return true;
}

// 翻译更正、需求改变、机构重复报名、代表离职、纪要分歧等修订只追加，不覆盖原记录。
export function checkAmendments(domain) {
  const causes = new Set(domain.amendment_causes);
  for (const item of domain.sample.amendments ?? []) {
    if (!causes.has(item.cause)) throw new Error(`修订原因不在约定范围：${item.cause}`);
    if (!item.target) throw new Error('修订必须指向原记录');
    if (item.kept_original !== true) throw new Error('修订必须保留原记录，不得覆盖');
  }
  return true;
}

// 试验、尽调、采购进度由双方分别确认，任一方不能代替对方宣布完成。
export function checkConfirmations(domain) {
  const categories = new Set(domain.milestone_categories);
  const roles = new Set((domain.sample.profiles ?? []).map((profile) => profile.role));
  for (const milestone of domain.sample.milestones ?? []) {
    if (!categories.has(milestone.category)) throw new Error(`未知里程碑类别：${milestone.category}`);
    const confirmations = milestone.confirmations ?? {};
    const parties = Object.keys(confirmations);
    if (parties.some((party) => !roles.has(party))) throw new Error(`确认方不是会谈参与方：${milestone.title}`);
    const agreed = parties.length >= 2 && parties.every((party) => confirmations[party] === true);
    if (milestone.complete !== agreed) throw new Error(`完成状态与双方确认不一致：${milestone.title}`);
  }
  return true;
}

// 主办方依据双方确认辨别真实会谈、样品验证与合同进展。
export function checkProgressEvidence(domain) {
  const known = new Set(domain.progress_evidence);
  for (const item of domain.sample.progress_evidence ?? []) {
    if (!known.has(item)) throw new Error(`未知进展类型：${item}`);
  }
  return true;
}

// 未成原因归纳为供需缺口，不得点名企业或泄露商业秘密。
export function checkGapSummaries(domain) {
  const reasons = new Set(domain.gap_reasons);
  const names = (domain.sample.profiles ?? []).map((profile) => profile.party);
  for (const gap of domain.sample.gap_summaries ?? []) {
    if (!reasons.has(gap.reason)) throw new Error(`未成原因不在归纳范围：${gap.reason}`);
    const text = JSON.stringify(gap);
    for (const name of names) {
      if (text.includes(name)) throw new Error(`供需缺口不得点名企业：${name}`);
    }
  }
  return true;
}

// 读取并校验全部领域规则。
export function validateDomain(raw) {
  const domain = parseDomain(raw);
  checkProfiles(domain);
  checkGates(domain);
  checkAmendments(domain);
  checkConfirmations(domain);
  checkProgressEvidence(domain);
  checkGapSummaries(domain);
  return domain;
}
