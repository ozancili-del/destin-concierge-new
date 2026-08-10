import regexChatHandler from "./chat.js";
import agentChatHandler from "./chat-agent.js";

export function agentV3Enabled(env = process.env) {
  return env.NEXT_PUBLIC_DESTINY_AGENT_V3 === "true";
}

export function selectDestinyChatHandler(env = process.env) {
  return agentV3Enabled(env) ? agentChatHandler : regexChatHandler;
}

export default function destinyChatRouter(req, res) {
  const useAgentV3 = agentV3Enabled();
  res.setHeader("X-Destiny-Route", useAgentV3 ? "agent-v3" : "regex-v1");
  return selectDestinyChatHandler()(req, res);
}

