import {isPrivatePeer} from '../../lib/destiny-brain/boundary.js';
import {brokerCall} from '../../lib/destiny-brain/broker-client.js';
export default async function handler(req,res){res.setHeader('Cache-Control','private, no-store');if(!isPrivatePeer(req))return res.status(404).json({error:'not_found'});if(req.method!=='GET')return res.status(405).end();try{return res.json(await brokerCall('status'));}catch{return res.status(503).json({error:'private_budget_unavailable'});}}
