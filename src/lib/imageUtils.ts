export function extractImages(content: string): string[] {
  const images: string[] = [];
  
  const urlPattern = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/gi;
  const base64Pattern = /(data:image\/[a-z]+;base64,[a-zA-Z0-9+/=]+)/gi;
  
  let match;
  while ((match = urlPattern.exec(content)) !== null) {
    images.push(match[1]);
  }
  while ((match = base64Pattern.exec(content)) !== null) {
    images.push(match[1]);
  }
  
  return images;
}

export function removeImagesFromText(content: string): string {
  const urlPattern = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/gi;
  const base64Pattern = /(data:image\/[a-z]+;base64,[a-zA-Z0-9+/=]+)/gi;
  
  return content.replace(urlPattern, '').replace(base64Pattern, '').trim();
}