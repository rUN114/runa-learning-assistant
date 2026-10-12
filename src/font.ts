'use strict';
const fontCache=new Map<string, Record<number, string>>();
function localFontMap(base64: string): Record<number, string>{
  if(fontCache.has(base64))return fontCache.get(base64);
  const binary=atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const font=Typr.parse(bytes.buffer)[0],map: Record<number, string>={};
  for(let code=19968;code<40870;code++){
    const glyph=Typr.U.codeToGlyph(font,code);if(!glyph)continue;
    const hash=md5(JSON.stringify(Typr.U.glyphToPath(font,glyph))).slice(24),value=LOCAL_FONT_TABLE[hash];
    if(value)map[code]=String.fromCharCode(value);
  }
  // 部分字形未识别只影响使用这些字形的题目，不能拖停整个课程。
  if(fontCache.size>=8)fontCache.delete(fontCache.keys().next().value);fontCache.set(base64,map);return map;
}
