export function highlightMentions(content: string): { text: string; isMention: boolean }[] {
  const parts: { text: string; isMention: boolean }[] = [];
  const regex = /@(\w+)|@everyone/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.substring(lastIndex, match.index), isMention: false });
    }
    parts.push({ text: match[0], isMention: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ text: content.substring(lastIndex), isMention: false });
  }

  return parts.length > 0 ? parts : [{ text: content, isMention: false }];
}