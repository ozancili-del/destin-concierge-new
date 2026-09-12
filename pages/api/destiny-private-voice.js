import { servePrivate } from '../../lib/destiny-brain/server.js';
import {servePrivateWeb} from '../../lib/destiny-brain/web-preview.js';
import {orderedMemoryEnabled,serveOrderedPreview} from '../../lib/destiny-brain/ordered-server.js';
export const config={maxDuration:180,api:{bodyParser:{sizeLimit:'80kb'}}};
export default function handler(req,res){return orderedMemoryEnabled()?serveOrderedPreview('voice',req,res):process.env.VERCEL_ENV==='preview'?servePrivateWeb('voice',req,res):servePrivate('voice',req,res);}
