import fs from 'node:fs/promises';
import {LocalArtifactStore} from '../lib/destiny-runtime/local-store.js';
const [artifactFile,root]=process.argv.slice(2);if(!artifactFile||!root)throw new Error('Pass artifact.json and a durable local store directory.');
const revision=await new LocalArtifactStore(root).put(JSON.parse(await fs.readFile(artifactFile,'utf8')));
console.log(JSON.stringify({revision,root,pointerChanged:false}));
