import { servePrivate } from '../../lib/destiny-brain/server.js';
import {servePrivateWeb} from '../../lib/destiny-brain/web-preview.js';
export const config={api:{bodyParser:{sizeLimit:'80kb'}}};
export default function handler(req,res){return process.env.VERCEL_ENV==='preview'?servePrivateWeb('voice',req,res):servePrivate('voice',req,res);}
