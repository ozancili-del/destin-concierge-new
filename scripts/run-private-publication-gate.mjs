import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import OpenAI from 'openai';
import {assertArtifact,digest} from '../lib/destiny-runtime/artifact.js';
import {executeTurn} from '../lib/destiny-runtime/execute.js';
import {createDefaultState} from '../lib/destiny-agent/business.js';
import {createSemanticInterpreter} from '../lib/destiny-runtime/semantic.js';
import {createAnswerGrader} from '../lib/destiny-runtime/answer-grader.js';
import {evaluationCases,runPublicationGate} from '../lib/destiny-runtime/publication-gate.js';
import {makeMockServices} from '../tests/test-helpers.mjs';

const [artifactFile,evaluationsFile,outputFile]=process.argv.slice(2);
throw new Error('Legacy v1 gate retired: it does not evaluate the recovered model-led runtime. Use the bounded recovery comparison. A new full paid run requires explicit approval and a v2-bound receipt.');
if(!artifactFile||!evaluationsFile||!outputFile)throw new Error('Usage: node --experimental-default-type=module scripts/run-private-publication-gate.mjs artifact.json evaluations.json report.json');
const artifact=assertArtifact(JSON.parse(await fs.readFile(artifactFile,'utf8')));
const evaluations=JSON.parse(await fs.readFile(evaluationsFile,'utf8'));
const cases=evaluationCases(evaluations),revision=digest(artifact);
await fs.mkdir(path.dirname(path.resolve(outputFile)),{recursive:true});
if(!process.env.OPENAI_API_KEY){
  await fs.writeFile(outputFile,JSON.stringify({status:'blocked',reason:'semantic_provider_unconfigured',revision,expected:cases.length,executed:0,passed:0,signedReceipt:null,publicActivation:false,servicesMode:'deterministic_fixtures'},null,2));
  console.log('Model gate not run: no OpenAI API key. No receipt issued.');process.exitCode=2;
}else{
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0});
  const model=process.env.DESTINY_PRIVATE_INTERPRETER_MODEL||'gpt-5.6-sol';
  const sourceFiles=['artifact','retrieve','semantic','policy','execute','answer-grader','publication-gate'];
  const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,digest((await fs.readFile(new URL(`../lib/destiny-runtime/${name}.js`,import.meta.url),'utf8')).replace(/\r\n/g,'\n'))])));
  for(const name of ['business','orchestrator','services'])sourceHashes[name]=digest((await fs.readFile(new URL(`../lib/destiny-agent/${name}.js`,import.meta.url),'utf8')).replace(/\r\n/g,'\n'));
  const runtimeFingerprint=digest({sourceHashes,model});
  const interpreter=createSemanticInterpreter({openai,model});
  let complete=0;
  const runCase=async({question,context,channel})=>{
    let session={id:randomBytes(18).toString('hex'),version:0,revision,business:createDefaultState(),history:[],pageContext:{source:'publication-evaluation',path:'/',unit:null},category:null,offeredEntityIds:[]};
    const ask=async text=>{const r=await executeTurn({text,history:session.history,session,artifact,interpreter,services:makeMockServices(),authority:{channel,grants:[]},traceId:randomBytes(12).toString('hex'),turnId:`eval-${session.version}`,now:new Date(`${artifact.asOf}T17:00:00Z`)});session=r.session;return r.result;};
    if(context?.prior_guest_question)await ask(context.prior_guest_question);
    // Do not fabricate antecedents from expected entity IDs or answer assertions.
    const result=await ask(question);if(++complete%20===0)console.log(`Executed ${complete} channel turns.`);return result;
  };
  const gate=await runPublicationGate({artifact,evaluations,runCase,gradeAnswer:createAnswerGrader({openai,artifact,model}),signingKey:process.env.DESTINY_PRIVATE_PUBLISHER_KEY||randomBytes(32).toString('hex'),structuralPassed:true,runtimeFingerprint,concurrency:4,onProgress:async({completed,total,result})=>{await fs.appendFile(`${outputFile}.progress.jsonl`,JSON.stringify(result)+'\n');console.log(`Completed ${completed}/${total}: ${result.id} ${result.passed?'passed':result.errors.join(', ')}`);}});
  // This is the language/routing gate with controlled services. Physical audio,
  // real provider access and complete capability acceptance remain separate.
  await fs.writeFile(outputFile,JSON.stringify({...gate,servicesMode:'deterministic_fixtures',publicActivation:false},null,2));
  console.log(`Gate ${gate.receipt.status}: ${gate.receipt.executed} cases, ${gate.receipt.failed} failures. No pointer changed.`);
  if(gate.receipt.status!=='passed')process.exitCode=1;
}
