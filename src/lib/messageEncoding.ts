export function encodeMessage(content: string): string {
  return Buffer.from(content).toString('base64');
}

export function decodeMessage(content: string): string {
  try {
    return Buffer.from(content, 'base64').toString('utf-8');
  } catch {
    return content;
  }
}