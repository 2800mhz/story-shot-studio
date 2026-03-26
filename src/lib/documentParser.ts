import mammoth from 'mammoth';

export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  const options = {
    styleMap: [
      "u => u",
      "strike => del",
      "r[highlight='yellow'] => mark",
      "r[highlight='green'] => mark",
      "r[highlight='cyan'] => mark",
      "r[highlight='magenta'] => mark",
      "r[highlight='blue'] => mark",
      "r[highlight='red'] => mark",
      "r[highlight='darkYellow'] => mark",
      "r[highlight='darkBlue'] => mark",
      "r[highlight='darkCyan'] => mark",
      "r[highlight='darkGreen'] => mark",
      "r[highlight='darkMagenta'] => mark",
      "r[highlight='darkRed'] => mark",
      "r[highlight='black'] => mark"
    ]
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  let html = result.value;
  
  // Debug: log if mark tags are present and any conversion warnings
  const markCount = (html.match(/<mark>/g) || []).length;
  console.log(`[DocumentParser] mark tags found: ${markCount}`);
  if (result.messages && result.messages.length > 0) {
    console.log('[DocumentParser] mammoth messages:', result.messages);
  }
  if (markCount === 0) {
    console.log('[DocumentParser] First 500 chars of raw HTML:', html.substring(0, 500));
  }
  
  // Safe two-step strip: remove opening <p> tags, replace closing </p> with newline
  html = html.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '\n');
  
  return html;
}

export async function parseTxtFile(file: File): Promise<string> {
  return await file.text();
}

export async function parseDocument(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'docx') {
    return parseDocxFile(file);
  }
  return parseTxtFile(file);
}
