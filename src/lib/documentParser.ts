import mammoth from 'mammoth';
import * as fflate from 'fflate';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let bufferToConvert = arrayBuffer;

  console.log('[DocumentParser] Starting docx parsing...');

  try {
    // 1. Unzip the docx to modify document.xml before mammoth sees it
    const zip = fflate.unzipSync(new Uint8Array(arrayBuffer));
    const docXmlBytes = zip['word/document.xml'];
    
    if (docXmlBytes) {
      console.log('[DocumentParser] Found document.xml, parsing...');
      const docXmlStr = fflate.strFromU8(docXmlBytes);
      
      // 2. Parse XML
      const parser = new XMLParser({
        ignoreAttributes: false,
        preserveOrder: true,
        parseAttributeValue: false,
        trimValues: false,
      });
      const docObj = parser.parse(docXmlStr);

      // 3. Walk AST and modify yellow runs
      const YELLOW_HEX = new Set(['ffff00', 'ffd700', 'ffe700', 'ffcc00', 'f0e68c', 'fde047']);
      let modifiedRuns = 0;

      function walk(node: any) {
        if (!node) return;
        
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }

        if (node['w:r']) {
          const run = node['w:r'];
          let isYellow = false;
          
          const rPrNode = run.find((child: any) => child['w:rPr']);
          if (rPrNode) {
            const rPr = rPrNode['w:rPr'];
            rPr.forEach((prop: any) => {
              if (prop['w:highlight'] && prop['w:highlight'].length > 0) {
                const val = prop['w:highlight'][0]['@_w:val'];
                if (val === 'yellow' || val === 'darkYellow') isYellow = true;
              }
              if (prop['w:shd'] && prop['w:shd'].length > 0) {
                let val = prop['w:shd'][0]['@_w:fill'] || '';
                if (val) {
                   val = val.replace('#', '').toLowerCase();
                   if (YELLOW_HEX.has(val)) isYellow = true;
                }
              }
            });

            if (isYellow) {
               // Force standard <w:highlight w:val="yellow"/>
               for (let i = rPr.length - 1; i >= 0; i--) {
                  if (rPr[i]['w:highlight']) rPr.splice(i, 1);
               }
               rPr.push({ 'w:highlight': [ { ':@': { '@_w:val': 'yellow' } } ] });
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

      // 4. Rebuild XML if modifications were made
      if (modifiedRuns > 0) {
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          preserveOrder: true,
          suppressEmptyNode: true,
          format: false
        });
        
        const newDocXmlStr = builder.build(docObj);
        zip['word/document.xml'] = fflate.strToU8(newDocXmlStr);
        
        // 5. Re-zip
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
    // Fall back to original un-modified arrayBuffer
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
