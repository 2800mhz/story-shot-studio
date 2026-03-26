import mammoth from 'mammoth';

export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  const options = {
    styleMap: [
      "u => u",
      "strike => del",
      "r[highlight='yellow'] => mark.docx-highlight",
      "r[highlight='green'] => mark.docx-highlight",
      "r[highlight='cyan'] => mark.docx-highlight",
      "r[highlight='magenta'] => mark.docx-highlight",
      "r[highlight='blue'] => mark.docx-highlight",
      "r[highlight='red'] => mark.docx-highlight",
      "r[highlight='darkYellow'] => mark.docx-highlight",
      "r[highlight='darkBlue'] => mark.docx-highlight",
      "r[highlight='darkCyan'] => mark.docx-highlight",
      "r[highlight='darkGreen'] => mark.docx-highlight",
      "r[highlight='darkMagenta'] => mark.docx-highlight",
      "r[highlight='darkRed'] => mark.docx-highlight",
      "r[highlight='black'] => mark.docx-highlight"
    ]
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  let html = result.value;
  
  // Convert paragraph tags to line breaks safely
  // We want to keep the content (including <mark> tags) inside the paragraphs
  html = html.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n');
  
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
