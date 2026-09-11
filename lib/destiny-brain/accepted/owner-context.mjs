import approvedContract from './approved-owner-contract.json' with {type:'json'};
import currentOwnerDecisions from './owner-decisions.json' with {type:'json'};
import {hash,requireContract} from './kernel.mjs';
import {assertPayloadSafe} from './vendor/privacy.mjs';
import {compilePublicKnowledge} from './public-knowledge.mjs';
import {COMPOSITION_RULES} from './composition-guidance.mjs';

export const OWNER_CONTEXT_HEADER='CURRENT APPROVED OWNER AUTHORITY\n';
export const OWNER_PRECEDENCE='Apply this entire current approved owner policy and presentation package wherever relevant. Its owner corrections take precedence over older overlapping HQ fields, cached context and previous answers. The primary COMPOSITION CONTRACT is the latest owner direction on answer scope and governs any competing presentation wording in this bundle. Preserve other compatible HQ facts. Behavior rules and presentation instructions govern your reasoning; do not recite editorial instructions, internal qualifiers, rule IDs or provenance to the guest. Select relevant facts and compose a natural answer. This package does not establish live conditions or grant tool permissions; action permissions and current service results still govern actions.';

// An independently frozen source contract makes omission detectable even if the
// input artifact loses both a package and its directory entry. Updating approved
// sources requires a new reviewed contract/revision, never automatic acceptance.
export function compileOwnerContext(artifact) {
  const c=approvedContract;
  requireContract(artifact?.sourceRevision===c.sourceRevision&&artifact.authority===c.authority,'owner_source_revision_mismatch');
  requireContract(Array.isArray(artifact.packages)&&Array.isArray(artifact.index)&&Array.isArray(artifact.catalog),'owner_source_structure_missing');
  const packages=artifact.packages.filter(p=>c.ownerTopics.includes(p.topic));
  requireContract(hash(packages.map(p=>p.id))===hash(c.packageIds),'owner_package_inventory_mismatch');
  requireContract(Array.isArray(artifact.ownerPresentation)&&hash(artifact.ownerPresentation)===c.presentationHash,'owner_presentation_incomplete');
  requireContract(artifact.behaviorRules&&hash(artifact.behaviorRules)===c.behaviorHash,'owner_behavior_incomplete');
  requireContract(hash(packages)===c.packagesHash,'owner_package_incomplete');
  for(const p of packages){
    requireContract(artifact.packages.filter(x=>x.id===p.id).length===1,'duplicate_owner_package');
    requireContract(artifact.index.filter(x=>x.id===p.id&&x.topic===p.topic).length===1,'owner_index_incomplete');
  }
  for(const topic of c.ownerTopics){
    const count=packages.filter(p=>p.topic===topic).length;
    requireContract(artifact.catalog.filter(x=>x.topic===topic&&x.entities===count).length===1,'owner_catalog_incomplete');
    requireContract(artifact.index.filter(x=>x.topic===topic).length===count,'owner_index_incomplete');
  }
  const guestPackages=compilePublicKnowledge(artifact).packages.filter(p=>c.packageIds.includes(p.id));
  const bundle={schemaVersion:2,sourceRevision:c.sourceRevision,authority:c.authority,precedence:OWNER_PRECEDENCE,behaviorRules:artifact.behaviorRules.rules.map(({instruction,fact})=>({...instruction?{instruction}:{},...fact?{fact}:{}})),ownerPresentation:artifact.ownerPresentation.map(({instruction})=>({instruction})),packages:guestPackages,currentOwnerDecisions:{id:currentOwnerDecisions.id,precedence:currentOwnerDecisions.precedence,modelRules:[...currentOwnerDecisions.modelRules,...COMPOSITION_RULES]}};
  assertPayloadSafe(bundle);
  return structuredClone({bundle,manifest:{contractHash:hash(c),bundleHash:hash(bundle),packageIds:c.packageIds,presentationIds:c.presentationIds,behaviorIds:c.behaviorIds}});
}

const isOwnerMessage=m=>m.role==='developer'&&typeof m.content==='string'&&m.content.startsWith(OWNER_CONTEXT_HEADER);
export function ownerMessage(context){
  requireContract(hash(context.bundle)===context.manifest.bundleHash,'owner_bundle_changed');
  return {role:'developer',content:OWNER_CONTEXT_HEADER+JSON.stringify(context)};
}
export function attachOwnerContext(input,context){
  const result=input.filter(m=>!isOwnerMessage(m));
  const lastDeveloper=result.findLastIndex(m=>m.role==='developer');
  result.splice(lastDeveloper+1,0,ownerMessage(context));
  assertOwnerContextInput(result,context);return result;
}
export function assertOwnerContextInput(input,context){
  const matches=input.filter(isOwnerMessage);
  requireContract(matches.length===1&&hash(matches[0])===hash(ownerMessage(context)),'owner_context_missing_or_changed');
  requireContract(input.findLastIndex(m=>m.role==='developer')===input.indexOf(matches[0]),'owner_precedence_order_invalid');
}
