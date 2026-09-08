import { servePrivate } from '../../lib/destiny-runtime/private-server.js';
export const config={api:{bodyParser:{sizeLimit:'18kb'}}};
export default function handler(req,res){return servePrivate('chat',req,res);}
