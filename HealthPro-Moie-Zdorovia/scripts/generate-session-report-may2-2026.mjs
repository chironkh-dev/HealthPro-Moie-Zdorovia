import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', 'HealthPro_Session_May2026_2_Report.pdf');

const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream(OUT));

const C = {
  navy:   '#1e3a5f',
  blue:   '#2563eb',
  green:  '#16a34a',
  amber:  '#d97706',
  red:    '#dc2626',
  gray:   '#64748b',
  light:  '#f1f5f9',
  white:  '#ffffff',
  black:  '#0f172a',
  border: '#cbd5e1',
  purple: '#7c3aed',
};

const W  = doc.page.width - 100;
const ML = 50;

function rule(color = C.border, h = 1) {
  doc.save()
     .moveTo(ML, doc.y).lineTo(ML + W, doc.y)
     .lineWidth(h).strokeColor(color).stroke()
     .restore()
     .moveDown(0.3);
}

function h1(text) {
  doc.moveDown(0.4)
     .font('Helvetica-Bold').fontSize(17).fillColor(C.navy)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.2);
  rule(C.navy, 2);
  doc.moveDown(0.4);
}

function h2(text, color = C.blue) {
  doc.moveDown(0.5)
     .font('Helvetica-Bold').fontSize(12).fillColor(color)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.25);
}

function body(text, color = C.black) {
  doc.font('Helvetica').fontSize(10).fillColor(color)
     .text(text, ML, doc.y, { width: W, lineGap: 2 })
     .moveDown(0.3);
}

function bullet(text, color = C.black) {
  doc.font('Helvetica').fontSize(10).fillColor(color)
     .text('• ' + text, ML + 12, doc.y, { width: W - 12, lineGap: 2 })
     .moveDown(0.2);
}

function badge(label, value, x, y, w, bg, fg = C.white) {
  doc.save()
     .roundedRect(x, y, w, 52, 6).fillColor(bg).fill()
     .font('Helvetica-Bold').fontSize(22).fillColor(fg)
     .text(String(value), x, y + 8, { width: w, align: 'center' })
     .font('Helvetica').fontSize(9).fillColor(fg)
     .text(label, x, y + 36, { width: w, align: 'center' })
     .restore();
}

function tableRow(cols, widths, isHeader = false) {
  const startX = ML;
  const rowH = isHeader ? 22 : 20;
  const y = doc.y;

  if (isHeader) {
    doc.save().rect(startX, y, W, rowH).fillColor(C.navy).fill().restore();
  } else {
    doc.save().rect(startX, y, W, rowH).fillColor(C.light).fill().restore();
  }

  let cx = startX + 4;
  cols.forEach((col, i) => {
    const txtColor = isHeader ? C.white : C.black;
    const fnt = isHeader ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(fnt).fontSize(9).fillColor(txtColor)
       .text(col, cx, y + 5, { width: widths[i] - 8, lineBreak: false });
    cx += widths[i];
  });

  doc.y = y + rowH + 2;
}

// ════════════════════════════════════════════════════════════
// COVER PAGE
// ════════════════════════════════════════════════════════════

doc.save()
   .rect(0, 0, doc.page.width, 200).fillColor(C.navy).fill()
   .restore();

doc.font('Helvetica-Bold').fontSize(32).fillColor(C.white)
   .text('HealthPro', ML, 45, { width: W, align: 'center' });
doc.font('Helvetica').fontSize(14).fillColor('#93c5fd')
   .text('\u041c\u043e\u0454 \u0417\u0434\u043e\u0440\u043e\u0432\u2019\u044f', ML, 85, { width: W, align: 'center' });

doc.save()
   .moveTo(ML + W * 0.3, 108).lineTo(ML + W * 0.7, 108)
   .lineWidth(1).strokeColor('#3b82f6').stroke()
   .restore();

doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white)
   .text('\u0417\u0432\u0456\u0442 \u0441\u0435\u0441\u0456\u0457 \u2014 \u0411\u0430\u0433 #4, \u0406\u043a\u043e\u043d\u043a\u0430, \u0412\u0438\u0434\u0430\u043b\u0435\u043d\u043d\u044f PWA', ML, 118, { width: W, align: 'center' });
doc.font('Helvetica').fontSize(10).fillColor('#bfdbfe')
   .text('\u0414\u0430\u0442\u0430: 4 \u0442\u0440\u0430\u0432\u043d\u044f 2026 \u0440.', ML, 140, { width: W, align: 'center' });

// Badges
const bY = 215;
const bW = 100;
const gap = (W - 4 * bW) / 3;
badge('475', '475', ML,                     bY, bW, C.green);
badge('\u0422\u0435\u0441\u0442\u0456\u0432', '475', ML,                     bY, bW, C.green);
badge('\u0424\u0430\u0439\u043b\u0456\u0432 \u0437\u043c\u0456\u043d\u0435\u043d\u043e', '8', ML + bW + gap,       bY, bW, C.blue);
badge('\u0422\u0435\u0441\u0442\u0456\u0432 \u043e\u043d\u043e\u0432\u043b\u0435\u043d\u043e', '5', ML + 2*(bW+gap), bY, bW, C.amber);
badge('\u0411\u0430\u0433\u0456\u0432 \u0432\u0438\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e', '3', ML + 3*(bW+gap), bY, bW, C.purple);

doc.y = bY + 52 + 20;

// sub-badges labels
doc.font('Helvetica').fontSize(8).fillColor(C.gray)
   .text('\u0432\u0441\u0456 \u0437\u0435\u043b\u0435\u043d\u0456', ML, doc.y, { width: bW, align: 'center' });
doc.font('Helvetica').fontSize(8).fillColor(C.gray)
   .text('JS + Android + \u0422\u0435\u0441\u0442\u0438', ML + bW + gap, doc.y, { width: bW, align: 'center' });
doc.y += 14;

// ════════════════════════════════════════════════════════════
// SECTION 1 — КОНТЕКСТ
// ════════════════════════════════════════════════════════════

h1('1  \u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442 \u0441\u0435\u0441\u0456\u0457');

body('\u041f\u043e\u043f\u0435\u0440\u0435\u0434\u043d\u044f \u0441\u0435\u0441\u0456\u044f (\u0442\u0440\u0430\u0432\u0435\u043d\u044c 2026) \u0432\u0438\u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0431\u0430\u0433\u0438 #1\u20133 \u043a\u0440\u043e\u043a\u043e\u043c\u0456\u0440\u0430: \u0440\u043e\u0437\u0431\u0456\u0436\u043d\u0456\u0441\u0442\u044c \u0434\u0430\u043d\u0438\u0445 \u0448\u0442\u043e\u0440\u043a\u0430/\u0434\u043e\u0434\u0430\u0442\u043e\u043a, \u0445\u0438\u0431\u043d\u0435 \u0440\u0430\u0445\u0443\u043d\u043a\u0438 \u0442\u0430\u043f\u0456\u0432 \u043f\u043e \u0435\u043a\u0440\u0430\u043d\u0443, \u0437\u0443\u043f\u0438\u043d\u043a\u0430 \u0441\u0435\u0440\u0432\u0456\u0441\u0443. \u041f\u0456\u0441\u043b\u044f \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u0442\u0435\u0441\u0442\u0443\u0432\u0430\u043d\u043d\u044f \u0437\u043d\u0430\u0439\u0448\u043e\u0432\u0430\u043d\u043e \u0431\u0430\u0433 #4, \u0430 \u0442\u0430\u043a\u043e\u0436 \u043f\u0440\u0438\u0439\u043d\u044f\u0442\u043e \u0440\u0456\u0448\u0435\u043d\u043d\u044f \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 PWA-\u0444\u0430\u0437\u0443 \u043f\u0440\u043e\u0454\u043a\u0442\u0443 (\u043f\u0435\u0440\u0435\u0439\u0448\u043b\u0430 \u0432 \u043d\u0430\u0442\u0438\u0432\u043d\u0438\u0439 Android).');

// ════════════════════════════════════════════════════════════
// SECTION 2 — БАГ #4
// ════════════════════════════════════════════════════════════

h1('2  \u0411\u0430\u0433 #4 \u2014 \u041f\u0440\u0456\u043e\u0440\u0438\u0442\u0435\u0442 \u0434\u0430\u043d\u0438\u0445 \u0441\u0435\u0440\u0432\u0456\u0441\u0443');

h2('2.1 \u0421\u0438\u043c\u043f\u0442\u043e\u043c');
body('\u041f\u0456\u0441\u043b\u044f \u043f\u0435\u0440\u0435\u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f: BootReceiver \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u0454 \u0441\u0435\u0440\u0432\u0456\u0441, \u0441\u0435\u0440\u0432\u0456\u0441 \u043d\u0430\u0440\u0430\u0445\u043e\u0432\u0443\u0454, \u043d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434, 150 \u043a\u0440\u043e\u043a\u0456\u0432. \u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447 \u0432\u0456\u0434\u043a\u0440\u0438\u0432\u0430\u0454 \u0434\u043e\u0434\u0430\u0442\u043e\u043a \u2014 \u043f\u043e\u043a\u0430\u0437\u0443\u0454 \u0456\u043d\u0448\u0456 \u0434\u0430\u043d\u0456. \u041f\u0435\u0440\u0435\u0445\u043e\u0434\u0438\u0442\u044c \u0432 \u0448\u0442\u043e\u0440\u043a\u0443 \u2014 \u0434\u0430\u043d\u0456 \u043e\u043d\u043e\u0432\u043b\u044e\u044e\u0442\u044c\u0441\u044f \u043d\u0430 \u0442\u0456, \u0449\u043e \u0431\u0443\u043b\u0438 \u0432 \u0434\u043e\u0434\u0430\u0442\u043a\u0443 (\u0437\u0431\u0440\u0438\u0432 \u043d\u0430\u0440\u0430\u0445\u043e\u0432\u0430\u043d\u0438\u0445 \u043a\u0440\u043e\u043a\u0456\u0432). \u041c\u0430\u0454 \u0431\u0443\u0442\u0438 \u043d\u0430\u0432\u043f\u0430\u043a\u0438.');

h2('2.2 \u041f\u0435\u0440\u0448\u043e\u043f\u0440\u0438\u0447\u0438\u043d\u0430');
body('\u0421\u0442\u0430\u0440\u0430 \u043b\u043e\u0433\u0456\u043a\u0430: \u043f\u0440\u0438 \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u0442\u0456 \u0434\u043e\u0434\u0430\u0442\u043a\u0443 enableSteps() \u0437\u0430\u0432\u0436\u0434\u0438 \u0447\u0438\u0442\u0430\u0432 stepCount \u0437 \u0411\u0414 (\u043c\u043e\u0433\u043b\u043e \u0431\u0443\u0442\u0438 0 \u043f\u0456\u0441\u043b\u044f reboot) \u0456 \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0432 \u0446\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f \u0443 startStepService() \u044f\u043a initialSteps \u2014 \u0441\u0435\u0440\u0432\u0456\u0441 \u0441\u043a\u0438\u0434\u0430\u0432 \u0441\u0432\u0456\u0439 \u043b\u0456\u0447\u0438\u043b\u044c\u043d\u0438\u043a \u0434\u043e \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f \u0437 \u0411\u0414.');

h2('2.3 \u0420\u0456\u0448\u0435\u043d\u043d\u044f');
bullet('enableSteps(\'foreground\'): \u0441\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u0432\u0438\u043a\u043b\u0438\u043a\u0430\u0454\u043c\u043e getServiceStatus(). \u042f\u043a\u0449\u043e running=true \u2014 \u0431\u0435\u0440\u0435\u043c\u043e \u043a\u0440\u043e\u043a\u0438 \u0417 \u0421\u0415\u0420\u0412\u0406\u0421\u0423, \u043d\u0435 \u043f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0441\u043a\u0430\u0454\u043c\u043e.');
bullet('enableSteps(\'foreground\'): \u042f\u043a\u0449\u043e running=false \u2014 \u043b\u0438\u0448\u0435 \u0442\u043e\u0434\u0456 \u0441\u0442\u0430\u0440\u0442\u0443\u0454\u043c\u043e \u0437 \u0434\u0430\u043d\u0438\u043c\u0438 \u0411\u0414.');
bullet('restoreSteps(): \u0430\u043d\u0430\u043b\u043e\u0433\u0456\u0447\u043d\u0430 \u043b\u043e\u0433\u0456\u043a\u0430 + \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u044e\u0454 stepEnabled=true \u0456 \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0430\u0454 listener \u044f\u043a\u0449\u043e \u0441\u0435\u0440\u0432\u0456\u0441 \u0436\u0438\u0432\u0438\u0439.');
bullet('\u0414\u0430\u043d\u0456 \u0441\u0435\u0440\u0432\u0456\u0441\u0443 \u0437\u0430\u0432\u0436\u0434\u0438 \u043c\u0430\u044e\u0442\u044c \u043f\u0440\u0456\u043e\u0440\u0438\u0442\u0435\u0442 \u043d\u0430\u0434 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e\u044e \u0411\u0414.');

// ════════════════════════════════════════════════════════════
// SECTION 3 — ІКОНКА
// ════════════════════════════════════════════════════════════

h1('3  \u041e\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0456\u043a\u043e\u043d\u043a\u0438 \u0441\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u043d\u044f');

h2('3.1 \u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442 Android');
body('\u0406\u043a\u043e\u043d\u043a\u0430 \u0441\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u043d\u044f \u043f\u043e\u0432\u0438\u043d\u043d\u0430 \u0431\u0443\u0442\u0438: \u043f\u043e\u0432\u043d\u0456\u0441\u0442\u044e \u0431\u0456\u043b\u0430 \u043d\u0430 \u043f\u0440\u043e\u0437\u043e\u0440\u043e\u043c\u0443 \u0444\u043e\u043d\u0456, \u0440\u043e\u0437\u043c\u0456\u0440 24\u00d724 dp, \u043d\u0435 \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u043a\u043e\u043b\u044c\u043e\u0440\u0456\u0432 (Android \u0441\u0430\u043c\u043e\u0441\u0442\u0456\u0439\u043d\u043e \u043a\u043e\u043b\u043e\u0440\u0443\u0454 \u0456\u043a\u043e\u043d\u043a\u0443 \u043f\u0456\u0434 \u0442\u0435\u043c\u0443).');

h2('3.2 \u0417\u043c\u0456\u043d\u0438');
bullet('\u0421\u0442\u0432\u043e\u0440\u0435\u043d\u043e Android Vector Drawable XML: android/app/src/main/res/drawable/ic_stat_notification.xml');
bullet('\u0421\u0438\u043b\u0443\u0435\u0442 \u043b\u044e\u0434\u0438\u043d\u0438, \u0449\u043e \u0439\u0434\u0435 (\u041c\u0430\u0442\u0435\u0440\u0456\u0430\u043b Design "directions_walk") \u2014 \u0447\u0438\u0441\u0442\u043e \u0431\u0456\u043b\u0438\u0439, \u0437\u0440\u043e\u0437\u0443\u043c\u0456\u043b\u0438\u0439 \u0441\u0438\u043c\u0432\u043e\u043b.');
bullet('StepCounterService.java \u0432\u0436\u0435 \u043f\u043e\u0441\u0438\u043b\u0430\u0454\u0442\u044c\u0441\u044f \u043d\u0430 R.drawable.ic_stat_notification \u2014 \u043d\u0456\u0447\u043e\u0433\u043e \u043d\u0435 \u0437\u043c\u0456\u043d\u044e\u0432\u0430\u043b\u0438\u0441\u044c \u0443 Java.');
bullet('\u0412\u0435\u043a\u0442\u043e\u0440\u043d\u0438\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u043c\u0430\u0448\u0442\u0430\u0431\u0443\u0454\u0442\u044c\u0441\u044f \u0431\u0435\u0437 \u0432\u0442\u0440\u0430\u0442\u0438 \u044f\u043a\u043e\u0441\u0442\u0456 \u043d\u0430 \u0431\u0443\u0434\u044c-\u044f\u043a\u0456\u0439 \u0449\u0456\u043b\u044c\u043d\u043e\u0441\u0442\u0456 \u0435\u043a\u0440\u0430\u043d\u0443.');

// ════════════════════════════════════════════════════════════
// SECTION 4 — PWA REMOVAL
// ════════════════════════════════════════════════════════════

h1('4  \u0412\u0438\u0434\u0430\u043b\u0435\u043d\u043d\u044f PWA');

h2('4.1 \u041c\u043e\u0442\u0438\u0432\u0430\u0446\u0456\u044f');
body('\u0414\u043e\u0434\u0430\u0442\u043e\u043a \u0454 \u043d\u0430\u0442\u0438\u0432\u043d\u0438\u043c Android-\u0437\u0430\u0441\u0442\u043e\u0441\u0443\u043d\u043a\u043e\u043c \u0447\u0435\u0440\u0435\u0437 Capacitor. PWA-\u0444\u0443\u043d\u043a\u0446\u0456\u043e\u043d\u0430\u043b \u0431\u0456\u043b\u044c\u0448\u0435 \u043d\u0435 \u043f\u043e\u0442\u0440\u0456\u0431\u0435\u043d \u0456 \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u0438\u0439 \u0437 \u043f\u0440\u043e\u0435\u043a\u0442\u0443.');

h2('4.2 \u0412\u0438\u0434\u0430\u043b\u0435\u043d\u043e');

const remW = [W * 0.35, W * 0.65];
tableRow(['\u0424\u0430\u0439\u043b', '\u0429\u043e \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e'], remW, true);
const rows4 = [
  ['index.html', 'apple-mobile-web-app-* meta, <link rel="manifest">, installBanner, updateBanner, offlineBar, "PWA" \u0443 \u0432\u0435\u0440\u0441\u0456\u0457'],
  ['src/app.js', '\u0406\u043c\u043f\u043e\u0440\u0442 installApp/registerSW/applyUpdate/setupOnlineIndicator, \u0432\u0438\u043a\u043b\u0438\u043a\u0438, \u0434\u0456\u0457 ACTIONS'],
  ['src/core/constants.js', '"PWA" \u0437 APP_BUILD_LABEL'],
  ['src/core/storage.js', '\u041a\u043e\u043c\u0435\u043d\u0442\u0430\u0440 "web/PWA"'],
  ['src/core/platform.js', '\u041a\u043e\u043c\u0435\u043d\u0442\u0430\u0440 "web (PWA)"'],
  ['src/features/pwa/index.js', '\u0417\u0430\u0447\u0438\u0449\u0435\u043d\u043e (\u0444\u0430\u0439\u043b \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e \u0434\u043b\u044f \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438)'],
];
rows4.forEach(r => tableRow(r, remW));

doc.moveDown(0.5);

// ════════════════════════════════════════════════════════════
// SECTION 5 — ЗВЕДЕНА ТАБЛИЦЯ
// ════════════════════════════════════════════════════════════

h1('5  \u0417\u0432\u0435\u0434\u0435\u043d\u0430 \u0442\u0430\u0431\u043b\u0438\u0446\u044f \u0437\u043c\u0456\u043d\u0435\u043d\u0438\u0445 \u0444\u0430\u0439\u043b\u0456\u0432');

const tW = [W * 0.38, W * 0.12, W * 0.5];
tableRow(['\u0424\u0430\u0439\u043b', '\u0421\u0442\u0430\u0442\u0443\u0441', '\u0417\u043c\u0456\u043d\u0438'], tW, true);
const rows5 = [
  ['src/features/steps/index.js', '\u041e\u041d\u041e\u0412\u041b\u0415\u041d\u041e', '\u0411\u0430\u0433 #4: enableSteps + restoreSteps — \u043f\u0440\u0456\u043e\u0440\u0438\u0442\u0435\u0442 \u0441\u0435\u0440\u0432\u0456\u0441\u0443'],
  ['android/.../ic_stat_notification.xml', '\u041e\u041d\u041e\u0412\u041b\u0415\u041d\u041e', '\u0421\u0438\u043b\u0443\u0435\u0442 \u043b\u044e\u0434\u0438\u043d\u0438 \u0449\u043e \u0439\u0434\u0435, \u0431\u0456\u043b\u0438\u0439 Vector Drawable'],
  ['index.html', '\u041e\u041d\u041e\u0412\u041b\u0415\u041d\u041e', '\u0412\u0438\u0434\u0430\u043b\u0435\u043d\u043e PWA-\u043c\u0435\u0442\u0430, \u0431\u0430\u043d\u0435\u0440\u0438, offline-bar, "PWA" \u0443 \u0432\u0435\u0440\u0441\u0456\u0457'],
  ['src/app.js', '\u041e\u041d\u041e\u0412\u041b\u0415\u041d\u041e', '\u0412\u0438\u0434\u0430\u043b\u0435\u043d\u043e \u0456\u043c\u043f\u043e\u0440\u0442\u0438 PWA, \u0432\u0438\u043a\u043b\u0438\u043a\u0438 registerSW/setupOnlineIndicator'],
  ['src/core/constants.js', '\u041e\u041d\u041e\u0412\u041b\u0415\u041d\u041e', '"PWA" \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e \u0437 APP_BUILD_LABEL'],
  ['src/features/pwa/index.js', '\u0417\u0410\u0427\u0418\u0429\u0415\u041d\u041e', '\u041c\u043e\u0434\u0443\u043b\u044c \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e, \u0432\u043c\u0456\u0441\u0442 \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e'],
  ['tests/foreground-step.test.js', '\u041e\u041d\u041e\u0412\u041b\u0415\u041d\u041e', '5 \u0442\u0435\u0441\u0442\u0456\u0432 \u043e\u043d\u043e\u0432\u043b\u0435\u043d\u043e \u043f\u0456\u0434 \u043d\u043e\u0432\u0443 \u043b\u043e\u0433\u0456\u043a\u0443'],
  ['replit.md', '\u041e\u041d\u041e\u0412\u041b\u0415\u041d\u041e', '\u0410\u0440\u0445\u0456\u0442\u0435\u043a\u0442\u0443\u0440\u0430 \u043a\u0440\u043e\u043a\u043e\u043c\u0456\u0440\u0430, \u0456\u0441\u0442\u043e\u0440\u0456\u044f, PWA \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e'],
];
rows5.forEach(r => tableRow(r, tW));

doc.moveDown(0.5);

// ════════════════════════════════════════════════════════════
// SECTION 6 — ТЕСТИ
// ════════════════════════════════════════════════════════════

h1('6  \u0422\u0435\u0441\u0442\u0438 (Vitest)');

h2('6.1 \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442');
body('\u0412\u0441\u0456 475 \u0442\u0435\u0441\u0442\u0456\u0432 \u043f\u0440\u043e\u0439\u0448\u043b\u0438 (\u0437\u0430\u0433\u0430\u043b\u044c\u043d\u0430 \u043a\u0456\u043b\u044c\u043a\u0456\u0441\u0442\u044c \u0437\u0440\u043e\u0441\u043b\u0430 \u0437 228 \u0434\u043e 475 \u0437\u0430 \u0432\u0441\u0456 \u0441\u0435\u0441\u0456\u0457). \u0413\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u044f: ~3.5 \u0441\u0435\u043a.');

h2('6.2 \u041e\u043d\u043e\u0432\u043b\u0435\u043d\u0456 \u0442\u0435\u0441\u0442\u0438 (foreground-step.test.js)');
const tW2 = [W * 0.7, W * 0.3];
tableRow(['\u041d\u0430\u0437\u0432\u0430 \u0442\u0435\u0441\u0442\u0443', '\u0417\u043c\u0456\u043d\u0430'], tW2, true);
const rows6 = [
  ['calls startStepService when service is NOT running', '\u0437\u043c\u0456\u043d\u0435\u043d\u043e \u043c\u043e\u043a'],
  ['registers addStepUpdateListener when service starts fresh', '\u0434\u043e\u0434\u0430\u043d\u043e disableSteps()'],
  ['service data has priority even when service count is lower', '\u043d\u043e\u0432\u0430 \u043b\u043e\u0433\u0456\u043a\u0430'],
  ['falls back to active-only when service not running and startStepService fails', '\u0437\u043c\u0456\u043d\u0435\u043d\u043e \u043c\u043e\u043a'],
  ['service data has priority even when lower than DB count (Bug #4 fix)', '\u043d\u043e\u0432\u0430 \u043b\u043e\u0433\u0456\u043a\u0430'],
];
rows6.forEach(r => tableRow(r, tW2));

doc.moveDown(0.8);

// ════════════════════════════════════════════════════════════
// FOOTER
// ════════════════════════════════════════════════════════════

const footerY = doc.page.height - 40;
doc.save()
   .rect(0, footerY - 8, doc.page.width, 48).fillColor(C.navy).fill()
   .restore();
doc.font('Helvetica').fontSize(8).fillColor(C.white)
   .text(
     'HealthPro v4.0 \u00b7 Android Native \u00b7 \u0417\u0432\u0456\u0442 \u0441\u0435\u0441\u0456\u0457 #2 (05.2026) \u00b7 475/475 \u0442\u0435\u0441\u0442\u0456\u0432 \u0437\u0435\u043b\u0435\u043d\u0456',
     ML, footerY,
     { width: W, align: 'center' }
   );

doc.end();
console.log('PDF \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e:', OUT);
