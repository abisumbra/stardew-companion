// Native identifiers remain intact; only display fields are normalized.
export function displayText(value: unknown, fallback = '') {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  if (
    value.includes('[LocalizedText ') ||
    value.includes('[EscapedText ') ||
    value.includes('\uFFFD')
  )
    return fallback;
  return value
    .normalize('NFC')
    .replace(/\\n/g, '\n')
    .replace(/\^/g, '\n')
    .replace(/\$[a-z]\d*/gi, '')
    .trim();
}
