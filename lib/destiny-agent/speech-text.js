export function toSpokenText(value, maxLength = 1200) {
  let text = String(value || "");
  text = text
    .replace(/<a\b[^>]*>(.*?)<\/a>/gis, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/[`*_>#|~]/g, " ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\b(?:click|tap|follow)\s+(?:the\s+)?(?:link|button)(?:\s+(?:above|below|here))?\b/gi, "see the option on screen")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

  if (text.length > maxLength) {
    const clipped = text.slice(0, maxLength);
    const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
    text = (sentenceEnd > maxLength * 0.55 ? clipped.slice(0, sentenceEnd + 1) : clipped.trimEnd() + "…").trim();
  }
  return text;
}
