import mammoth from 'mammoth';
import * as fflate from 'fflate';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let bufferToConvert = arrayBuffer;

  console.log('[DocumentParser] Starting docx parsing...');

  try {
    const zip = fflate.unzipSync(new Uint8Array(arrayBuffer));
    const docXmlBytes = zip['word/document.xml'];
    
    if (docXmlBytes) {
      console.log('[DocumentParser] Found document.xml, parsing...');
      const docXmlStr = fflate.strFromU8(docXmlBytes);
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        preserveOrder: true,
        parseAttributeValue: false,
        trimValues: false,
      });
      const docObj = parser.parse(docXmlStr);

      const YELLOW_HEX = new Set(['ffff00', 'ffd700', 'ffe700', 'ffcc00', 'f0e68c', 'fde047']);
      let modifiedRuns = 0;
      let logCount = 0;

      function walk(node: any) {
        if (!node) return;
        
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }

        if (node['w:r']) {
          const run = node['w:r'];
          let isYellow = false;
          
          let textSample = '';
          const tNode = run.find((child: any) => child['w:t']);
          if (tNode) {
            textSample = typeof tNode['w:t'] === 'string' ? tNode['w:t'] : 
                         (Array.isArray(tNode['w:t']) && tNode['w:t'].length > 0 && tNode['w:t'][0]['#text'] ? tNode['w:t'][0]['#text'] : '');
          }

          const rPrNode = run.find((child: any) => child['w:rPr']);
          if (rPrNode) {
            const rPr = rPrNode['w:rPr'];
            
            // Bulletproof detection: convert run properties to string and search for yellow/hex
            const prStr = JSON.stringify(rPr).toLowerCase();
            
            // Check for standard highlight colors or shading hex codes
            if (
              prStr.includes('yellow') || 
              prStr.includes('darkyellow') ||
              prStr.includes('ffff00') || 
              prStr.includes('ffd700') || 
              prStr.includes('ffe700') || 
              prStr.includes('ffcc00') || 
              prStr.includes('f0e68c') || 
              prStr.includes('fde047')
            ) {
              isYellow = true;
            }

            if (isYellow) {
               // Remove existing highlight tags to prevent Word XML errors
               for (let i = rPr.length - 1; i >= 0; i--) {
                  if (rPr[i] && typeof rPr[i] === 'object' && ('w:highlight' in rPr[i])) {
                     rPr.splice(i, 1);
                  }
               }
               // Inject standard w:highlight tag that Mammoth understands natively
               rPr.push({ 'w:highlight': [], ':@': { '@_w:val': 'yellow' } });
               modifiedRuns++;
            }
          }
        } else {
          for (const key in node) {
             if (Array.isArray(node[key])) {
               walk(node[key]);
             } else if (typeof node[key] === 'object') {
               walk(node[key]);
             }
          }
        }
      }
      
      walk(docObj);
      console.log(`[DocumentParser] Modified ${modifiedRuns} yellow runs in XML.`);

      if (modifiedRuns > 0) {
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          preserveOrder: true,
          suppressEmptyNode: true,
          format: false
        });
        
        const newDocXmlStr = builder.build(docObj);
        zip['word/document.xml'] = fflate.strToU8(newDocXmlStr);
        
        const newZipBuffer = fflate.zipSync(zip);
        bufferToConvert = newZipBuffer.buffer as ArrayBuffer;
        console.log('[DocumentParser] Successfully rebuilt and zipped modified docx.');
      } else {
        console.log('[DocumentParser] No yellow runs found, skipping modification.');
      }
    } else {
      console.log('[DocumentParser] word/document.xml not found in zip.');
    }
  } catch (error) {
    console.error('[DocumentParser] Failed to modify OOXML:', error);
    bufferToConvert = arrayBuffer;
  }

  // 6. Run Mammoth
  const conversionOptions = {
    styleMap: [
      "u => u",
      "strike => del",
      "r[highlight='yellow'] => mark",
      "r[highlight='darkYellow'] => mark",
    ],
  };

  console.log('[DocumentParser] Running Mammoth convertToHtml...');
  const result = await mammoth.convertToHtml({ arrayBuffer: bufferToConvert }, conversionOptions as any);
  let html = result.value;

  const markCount = (html.match(/<mark>/g) || []).length;
  console.log(`[DocumentParser] mark tags after Mammoth conversion: ${markCount}`);

  // Safe two-step strip: remove <p> tags, replace </p> with newline
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
