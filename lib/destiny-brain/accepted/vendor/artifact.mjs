import { createHash } from 'node:crypto';

export const ARTIFACT_VERSION = 1;
export const COMPILER_VERSION = 'destiny-hq-compiler-1';
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function digest(value) { return createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex'); }
export function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export function tokens(value) {
  return [...new Set(String(value || '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{2,}/g) || [])];
}
const KEYS = {
  root: ['schemaVersion','compilerVersion','sourceRevision','sourceVersion','asOf','entries','index','projections'],
  entry: ['id','topicId','name','aliases','tags','questions','scope','categories','rankings','facts','recommendations'],
  fact: ['id','claim','qualifiers','validFrom','validUntil'],
  recommendation: ['id','text','basis'],
  projection: ['id','entityIds','parts','basis'],
  basis: ['factId','hash'],
  part: ['factId','text'],
};
function exactKeys(object, kind) {
  if (!object || typeof object !== 'object' || Array.isArray(object) || Object.keys(object).some(k => !KEYS[kind].includes(k)) || KEYS[kind].some(k => !(k in object))) throw new Error(`artifact_invalid_${kind}_fields`);
}
export function assertArtifact(payload, expectedHash = digest(payload)) {
  exactKeys(payload, 'root');
  if (digest(payload) !== expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('artifact_hash_mismatch');
  if (payload.schemaVersion !== ARTIFACT_VERSION || payload.compilerVersion !== COMPILER_VERSION) throw new Error('artifact_incompatible');
  if (!/^[a-f0-9]{40}$/.test(payload.sourceRevision||'') || !Number.isInteger(payload.sourceVersion) || !/^\d{4}-\d{2}-\d{2}$/.test(payload.asOf||'')) throw new Error('artifact_source_invalid');
  if (!Array.isArray(payload.entries) || !payload.entries.length || !Array.isArray(payload.projections)) throw new Error('artifact_empty');
  const ids = new Set(), facts = new Map();
  for (const e of payload.entries) {
    exactKeys(e, 'entry');
    const stringList=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
    if (![e.id,e.topicId,e.name].every(x=>typeof x==='string'&&x.length>0) || !['aliases','tags','questions','scope','categories'].every(k=>stringList(e[k])) || !Array.isArray(e.facts)||!e.facts.length||!Array.isArray(e.recommendations)||!e.rankings||Array.isArray(e.rankings)||Object.entries(e.rankings).some(([k,v])=>!e.categories.includes(k)||!Number.isFinite(v)||v<=0)) throw new Error('artifact_entry_invalid');
    if (ids.has(e.id)) throw new Error('artifact_duplicate_entry');
    ids.add(e.id);
    for (const f of e.facts) {
      exactKeys(f, 'fact');
      if (facts.has(f.id) || typeof f.claim !== 'string' || !f.claim.trim()) throw new Error('artifact_invalid_fact');
      if (typeof f.id!=='string'||!f.id||!stringList(f.qualifiers)||[f.validFrom,f.validUntil].some(v=>v!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(v))) throw new Error('artifact_invalid_fact_metadata');
      facts.set(f.id, f);
    }
  }
  const checkBasis = basis => {
    if (!Array.isArray(basis) || !basis.length) throw new Error('projection_basis_missing');
    for (const b of basis) { exactKeys(b,'basis'); if (!facts.has(b.factId) || digest(facts.get(b.factId)) !== b.hash) throw new Error('projection_basis_stale'); }
  };
  for (const e of payload.entries) for (const r of e.recommendations) { exactKeys(r,'recommendation'); checkBasis(r.basis); if(r.text!==r.basis.map(b=>facts.get(b.factId).claim).join(' '))throw new Error('recommendation_not_extractive'); }
  for (const p of payload.projections) {
    exactKeys(p,'projection'); checkBasis(p.basis);
    if (!p.entityIds.every(id => ids.has(id))) throw new Error('projection_entity_missing');
    for (const part of p.parts) {
      exactKeys(part,'part');
      if (!p.basis.some(b=>b.factId===part.factId) || facts.get(part.factId)?.claim !== part.text) throw new Error('projection_not_extractive');
    }
  }
  for (const postings of Object.values(payload.index)) if (!Array.isArray(postings) || !postings.every(id=>ids.has(id))) throw new Error('artifact_index_invalid');
  return freeze(payload);
}
