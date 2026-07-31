const TOKEN = /\{\{\s*[^{}]+?\s*\}\}/g;

function normalize(token: string): string {
  return `{{${token.slice(2, -2).trim()}}}`;
}

export function promptTokens(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(TOKEN), (match) => normalize(match[0])))];
}

export function lostTokens(before: string, after: string): string[] {
  const kept = new Set(promptTokens(after));
  return promptTokens(before).filter((token) => !kept.has(token));
}
