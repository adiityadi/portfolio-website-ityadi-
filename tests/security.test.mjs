import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyOrigin, safeUrl, inspectUpload, validateProject } from '../app/lib/validation.ts';
test('cross-origin and missing-origin mutations fail', () => {
  assert.throws(() => verifyOrigin(null,'https://portfolio.example/api/projects'), {status:403});
  assert.throws(() => verifyOrigin('https://attacker.example','https://portfolio.example/api/projects'), {status:403});
  assert.doesNotThrow(() => verifyOrigin('https://portfolio.example','https://portfolio.example/api/projects'));
});
test('unsafe URL schemes, credentials and scheme-relative URLs fail', () => {
  for (const url of ['javascript:alert(1)','data:text/html,x','//attacker.example','https://user:secret@host.example']) assert.throws(() => safeUrl(url,'Link'), {status:400});
  assert.equal(safeUrl('https://example.com/art.png','Image'),'https://example.com/art.png');
  assert.equal(safeUrl('/assets/adi-logo.png','Image'),'/assets/adi-logo.png');
  assert.equal(safeUrl('/assets/original-work-1.png','Image'),'/assets/original-work-1.png');
  for (const url of ['/assets/../secret.png','/assets/%2e%2e/secret.png','/assets/nested/art.png','/assets/fake.svg','/assets/evil.html']) assert.throws(() => safeUrl(url,'Image'),{status:400});
});
test('upload signature and MIME are both required; SVG/HTML rejected', () => {
  assert.throws(() => inspectUpload(new TextEncoder().encode('<svg onload="alert(1)"/>'),'image/svg+xml'), {status:400});
  const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10]);
  assert.throws(() => inspectUpload(png,'text/html'), {status:400});
  assert.equal(inspectUpload(png,'image/png').extension,'png');
});
test('GLB requires version and declared length consistency', () => {
  const metadata = new TextEncoder().encode('{"asset":{"version":"2.0"}} ');
  const data = new Uint8Array(20+metadata.length); data.set([103,108,84,70]); data.set(metadata,20); const v = new DataView(data.buffer);
  v.setUint32(4,2,true); v.setUint32(8,data.length,true); v.setUint32(12,metadata.length,true); v.setUint32(16,0x4e4f534a,true);
  assert.equal(inspectUpload(data,'application/octet-stream').kind,'model');
  v.setUint32(8,21,true); assert.throws(() => inspectUpload(data,'model/gltf-binary'),{status:400});
});
test('project status/order/category validated server-side', () => {
  const p = {title:'Work',category:'2d',medium:'',description:'',year:'2026',imageUrl:'https://example.com/a.png',modelUrl:'',sourceUrl:'',published:true,sortOrder:0};
  assert.equal(validateProject(p,'known').id,'known');
  assert.throws(() => validateProject({...p,published:'true'},'known'),{status:400});
  assert.throws(() => validateProject({...p,sortOrder:NaN},'known'),{status:400});
  assert.throws(() => validateProject({...p,imageUrl:''},'known'),{status:400});
});
