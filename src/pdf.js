// PDF-Export für Angebote (A4, DIN-5008-nahe Aufteilung).
// Schrift wird eingebettet, damit Umlaute und Währungszeichen wie zł, Kč oder ¥ korrekt erscheinen.
import { jsPDF } from 'jspdf';
import regularUrl from './assets/fonts/IBMPlexSans-Regular.ttf?url';
import boldUrl from './assets/fonts/IBMPlexSans-Bold.ttf?url';
import { isTauri } from './storage.js';

const GREEN = [47, 226, 155], BLUE = [54, 169, 255], NAVY = [11, 22, 48];
const INK = [12, 25, 48], MUTED = [83, 103, 138], LINE = [210, 220, 234];

async function fontBase64(url) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Logo konnte nicht geladen werden')); im.src = src; });
}

// Beliebiges Logo (PNG, JPG, WebP, SVG) als PNG mit Seitenverhältnis
async function logoToPng(dataUrl) {
  const im = await loadImage(dataUrl);
  const w = im.naturalWidth || 600, h = im.naturalHeight || 200, scale = Math.min(1, 800 / Math.max(w, h)) || 1;
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return { data: c.toDataURL('image/png'), ratio: c.width / c.height };
}

// #PS-Standardlogo direkt auf Canvas zeichnen (nutzt die geladene Chakra-Petch-Schrift)
async function defaultLogoPng() {
  try { await document.fonts.load("italic 700 21px 'Chakra Petch'"); } catch { /* Fallback-Schrift */ }
  const S = 4, c = document.createElement('canvas');
  c.width = c.height = 64 * S;
  const x = c.getContext('2d');
  x.scale(S, S);
  const g = x.createLinearGradient(0, 0, 64, 64);
  g.addColorStop(0, `rgb(${GREEN})`); g.addColorStop(1, `rgb(${BLUE})`);
  const r = 14;
  x.beginPath(); x.moveTo(2 + r, 2); x.arcTo(62, 2, 62, 62, r); x.arcTo(62, 62, 2, 62, r); x.arcTo(2, 62, 2, 2, r); x.arcTo(2, 2, 62, 2, r); x.closePath();
  x.fillStyle = `rgb(${NAVY})`; x.fill(); x.lineWidth = 3; x.strokeStyle = g; x.stroke();
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.stroke(new Path2D('M15 20 L9 32 L15 44')); x.stroke(new Path2D('M49 20 L55 32 L49 44'));
  x.fillStyle = '#e5eefc'; x.font = "italic 700 21px 'Chakra Petch', sans-serif"; x.textAlign = 'center'; x.fillText('#PS', 32, 40);
  x.fillStyle = g; x.fill(new Path2D('M37 9 L30 22 L35 22 L31 31 L41 17 L36 17 L39 9 Z'));
  return c.toDataURL('image/png');
}

function gradientRule(doc, x1, y, x2, h) {
  const steps = 60, w = (x2 - x1) / steps;
  for (let i = 0; i < steps; i++) {
    const k = i / (steps - 1);
    doc.setFillColor(...GREEN.map((v, j) => Math.round(v + (BLUE[j] - v) * k)));
    doc.rect(x1 + i * w, y, w + 0.05, h, 'F');
  }
}

async function savePdf(bytes, filename) {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: filename, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

export async function exportQuotePdf(m) {
  if (!m) throw new Error('Kein Angebot vorhanden');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Plex-R.ttf', await fontBase64(regularUrl)); doc.addFont('Plex-R.ttf', 'Plex', 'normal');
  doc.addFileToVFS('Plex-B.ttf', await fontBase64(boldUrl)); doc.addFont('Plex-B.ttf', 'Plex', 'bold');
  const L = 20, Rt = 190, W = Rt - L;
  const font = (style, size, color = INK) => { doc.setFont('Plex', style); doc.setFontSize(size); doc.setTextColor(...color); };

  // Kopf: Logo links, Angebotsdaten rechts
  let y = 18;
  if (m.logo) {
    const { data, ratio } = await logoToPng(m.logo);
    let h = 18, w = h * ratio; if (w > 60) { w = 60; h = w / ratio; }
    doc.addImage(data, 'PNG', L, y, w, h, undefined, 'FAST');
  } else {
    doc.addImage(await defaultLogoPng(), 'PNG', L, y, 16, 16, undefined, 'FAST');
    font('bold', 13); doc.text('POWERSCRIPTING', L + 20, y + 7.5);
    font('normal', 8.5, MUTED); doc.text('Elevate. Automate. Innovate.', L + 20, y + 12.5);
  }
  font('normal', 9, MUTED);
  doc.text(m.labels.quote, Rt, y + 3, { align: 'right' });
  font('bold', 11); doc.text(m.no, Rt, y + 8.5, { align: 'right' });
  font('normal', 9, MUTED); doc.text([m.labels.date, m.labels.valid], Rt, y + 13.5, { align: 'right', lineHeightFactor: 1.35 });
  gradientRule(doc, L, 40, Rt, 0.8);

  // Absenderzeile und Empfänger (Anschriftfeld ab ca. 50 mm)
  y = 52;
  if (m.sendLine) {
    font('normal', 7.5, MUTED); doc.text(m.sendLine, L, y);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(L, y + 1.2, L + Math.min(85, doc.getTextWidth(m.sendLine)), y + 1.2);
  }
  y += 6;
  m.cust.forEach((line, i) => { font(i === 0 ? 'bold' : 'normal', 10.5); doc.text(line, L, y); y += 5; });
  if (m.mail) { font('normal', 9, MUTED); doc.text(m.mail, L, y); y += 5; }

  // Titel
  y = Math.max(y + 10, 92);
  font('bold', 16); doc.text(doc.splitTextToSize(m.title, W), L, y); y += 6;
  font('normal', 9.5, MUTED); const sub = doc.splitTextToSize(m.sub, W); doc.text(sub, L, y); y += sub.length * 4.5 + 6;

  // Tabelle
  const cx = { pos: L, desc: L + 12, qty: 128, unit: 158, total: Rt };
  const head = () => {
    font('bold', 8.5, MUTED);
    doc.text(m.labels.pos.toUpperCase(), cx.pos, y); doc.text(m.labels.desc.toUpperCase(), cx.desc, y);
    doc.text(m.labels.qty.toUpperCase(), cx.qty, y, { align: 'right' }); doc.text(m.labels.unit.toUpperCase(), cx.unit, y, { align: 'right' });
    doc.text(m.labels.total.toUpperCase(), cx.total, y, { align: 'right' });
    y += 2.5; doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(L, y, Rt, y); y += 6;
  };
  head();
  font('normal', 10);
  doc.text('1', cx.pos, y);
  const titleLines = doc.splitTextToSize(m.title, cx.qty - cx.desc - 18);
  font('bold', 10); doc.text(titleLines, cx.desc, y);
  font('normal', 10); doc.text(String(m.qty), cx.qty, y, { align: 'right' }); doc.text(m.unit, cx.unit, y, { align: 'right' }); doc.text(m.total, cx.total, y, { align: 'right' });
  y += titleLines.length * 4.6;
  font('normal', 8.5, MUTED); const dl = doc.splitTextToSize(m.desc, cx.qty - cx.desc - 18); doc.text(dl, cx.desc, y); y += dl.length * 4 + 3;
  doc.setDrawColor(...LINE); doc.line(L, y, Rt, y); y += 6;
  if (m.vatLine) { font('normal', 9, MUTED); doc.text(m.vatLine, cx.desc, y); doc.text(m.vatAmount, cx.total, y, { align: 'right' }); y += 6; }
  gradientRule(doc, cx.unit - 30, y - 3.5, Rt, 0.5);
  font('bold', 11.5); doc.text(m.labels.sum, cx.desc, y + 2); doc.text(m.total, cx.total, y + 2, { align: 'right' });
  y += 12;
  if (m.note) { font('normal', 9, MUTED); doc.text(doc.splitTextToSize(m.note, W), L, y); }

  // Fußzeile
  if (m.cols.length) {
    const fy = 272, cw = W / m.cols.length;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(L, fy - 5, Rt, fy - 5);
    font('normal', 7.5, MUTED);
    m.cols.forEach((col, i) => doc.text(col, L + i * cw, fy, { lineHeightFactor: 1.4, maxWidth: cw - 4 }));
  }

  doc.setProperties({ title: `${m.labels.quote} ${m.no}`, subject: m.title, creator: '3D Print Calculator' });
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const filename = `${m.labels.quote}_${m.no}`.replace(/[^\w.\-äöüÄÖÜß]+/g, '_') + '.pdf';
  return savePdf(bytes, filename);
}
