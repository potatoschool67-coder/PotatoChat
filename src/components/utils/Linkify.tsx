import React from 'react';

export default function Linkify({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)|((?:www\.)?[a-z0-9]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
  
  const parts = text.split(urlRegex);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part) {
          if (part.match(/^https?:\/\//)) {
            return (
              <a 
                key={i} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all"
              >
                {part}
              </a>
            );
          } else if (part.match(/^(?:www\.)?[a-z0-9]+\.[a-z]{2,}$/i)) {
            return (
              <a 
                key={i} 
                href={`https://${part}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all"
              >
                {part}
              </a>
            );
          }
        }
        return part;
      })}
    </>
  );
}