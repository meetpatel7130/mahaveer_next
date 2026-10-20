import { jsPDF } from 'jspdf';
const Mahavirlogo = '/mahavirlogopdf.png';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_IMG || '';

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  black        : [255, 255, 255],
  blackSoft    : [10,  10,  10],
  blackSoftCard: [241, 245, 249],
  blackCard    : [255, 255, 255],
  blackRow     : [155, 194, 235],
  gold         : [37,  99, 235],
  goldLight    : [96, 165, 250],
  goldMuted    : [203, 213, 225],
  white        : [15,  23,  42],
  greyLight    : [51,  65,  85],
  greyMid      : [100, 116, 139],
  greyDark     : [148, 163, 184],
};

// ── Convert image URL → base64 ────────────────────────────────────────────────
async function imageUrlToBase64(url) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function assetToBase64(importedAsset) {
  if (!importedAsset) return null;
  if (importedAsset.startsWith('data:')) return importedAsset;
  const url = importedAsset.startsWith('http')
    ? importedAsset
    : window.location.origin + importedAsset;
  return imageUrlToBase64(url);
}

// ── Normalize product shape ───────────────────────────────────────────────────
function normalizeProduct(p) {
  const variantSource = p.variants || p.sku || p.sizes || [];
  return {
    name      : p.name || '—',
    description: p.description || '',
    hsnCode   : p.hsnCode || null,
    gstPercent: p.gstPercentage ?? p.gstPercent ?? null,
    img       : p.img || p.image || null,
    variants  : variantSource.map((v) => ({
      size      : v.size       ?? '—',
      mrp       : v.mrp        ?? 0,
      innerPack : v.innerPack  ?? '—',
      masterPack: v.masterPack ?? '—',
    })),
  };
}

// ── SKU-count bucketing ───────────────────────────────────────────────────────
// Bucket 1:  1–4  SKUs  → dense grid, 12/page   (fallback: single column if ≤4 products)
// Bucket 2:  5–7  SKUs  → grid, 9/page          (fallback: single column if ≤4 products)
// Bucket 3:  8–12 SKUs  → wide card, 2/page     (fallback: single column if ≤4 products)
// Bucket 4:  13+  SKUs  → wide card, 1/page     (fallback: single column if ≤4 products)
function getSkuBucket(product) {
  const n = product.variants.length;
  if (n <= 4)  return 1;
  if (n <= 7)  return 2;
  if (n <= 12) return 3;
  return 4;
}

function groupBySkuBucket(products) {
  const groups = { 1: [], 2: [], 3: [], 4: [] };
  products.forEach((p) => groups[getSkuBucket(p)].push(p));
  return groups;
}

// ═════════════════════════════════════════════════════════════════════════════
// generateProductSharePDF
// ═════════════════════════════════════════════════════════════════════════════
export async function generateProductSharePDF(products = []) {
  const normalized = (products || []).map(normalizeProduct);

  const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW     = pdf.internal.pageSize.getWidth();
  const PH     = pdf.internal.pageSize.getHeight();
  const MARGIN = 10;
  const USABLE = PW - 2 * MARGIN;

  // ── Page background ──────────────────────────────────────────────────────
  const fillPage = () => {
    pdf.setFillColor(...C.black);
    pdf.rect(0, 0, PW, PH, 'F');
  };

  // ── Text helpers ─────────────────────────────────────────────────────────
  const t = (str, x, y, opts = {}) => {
    pdf.setFontSize(opts.size || 8);
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setTextColor(...(opts.color || C.white));
    pdf.text(String(str ?? ''), x, y, { align: opts.align || 'left' });
  };

  const textWidth = (str, size, bold) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    return pdf.getTextWidth(String(str ?? ''));
  };

  const truncate = (str, maxWidth, size, bold) => {
    const s = String(str ?? '');
    if (textWidth(s, size, bold) <= maxWidth) return s;
    let out = s;
    while (out.length > 1 && textWidth(out + '…', size, bold) > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? out + '…' : '…';
  };

  const descriptionLines = (description, maxWidth, size, maxLines) => {
    if (!description) return [];
    pdf.setFontSize(size);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(String(description), maxWidth);
    if (lines.length <= maxLines) return lines;
    return [
      ...lines.slice(0, maxLines - 1),
      truncate(`${lines[maxLines - 1]}…`, maxWidth, size, false),
    ];
  };

  if (!normalized.length) {
    fillPage();
    t('No products selected.', PW / 2, PH / 2, { size: 12, color: C.greyMid, align: 'center' });
    return pdf;
  }

  // ── Pre-load assets ──────────────────────────────────────────────────────
  const logoData = await assetToBase64(Mahavirlogo);

  const imageCache = {};
  for (const p of normalized) {
    if (p.img && !imageCache[p.img]) {
      const url = p.img.startsWith('http') ? p.img : `${BACKEND_URL}${p.img}`;
      imageCache[p.img] = await imageUrlToBase64(url);
    }
  }

  // ── Header / Footer ──────────────────────────────────────────────────────
  const HEADER_H = 24;
  const FOOTER_H = 10;

  const drawHeader = () => {
    pdf.setFillColor(...C.blackSoft);
    pdf.rect(0, 0, PW, HEADER_H, 'F');
    pdf.setDrawColor(...C.gold);
    pdf.setLineWidth(0.6);
    pdf.line(0, HEADER_H, PW, HEADER_H);
    if (logoData) {
      try { pdf.addImage(logoData, 'PNG', MARGIN, 4, 18, 18); } catch { /* skip */ }
    }
    t('Mahaveer Hospitality',           PW / 2, 12, { size: 15, bold: true, color: [255, 255, 255], align: 'center' });
    t('P R O D U C T   C A T A L O G', PW / 2, 19, { size: 8,  color: [203, 213, 225],             align: 'center' });
  };

  const stampFooters = () => {
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      const fY = PH - 5;
      pdf.setDrawColor(...C.goldMuted);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN, fY - 4, PW - MARGIN, fY - 4);
      t('Mahaveer Hospitality \u2014 Product Catalog', MARGIN, fY, { size: 7, color: C.greyMid });
      t(`Page ${i} of ${pageCount}`, PW - MARGIN, fY, { size: 7, color: C.greyMid, align: 'right' });
    }
  };

  // ── Page-flow controller ─────────────────────────────────────────────────
  // Every bucket/layout calls startNewPage() at least once (guarantees each
  // range starts on its own fresh page and ranges never mix on one page).
  let pageStarted = false;
  const startNewPage = () => {
    if (pageStarted) pdf.addPage();
    pageStarted = true;
    fillPage();
    drawHeader();
  };

  const GRID_TOP    = HEADER_H + 6;
  const GRID_BOTTOM = PH - FOOTER_H - 4;
  const GRID_H      = GRID_BOTTOM - GRID_TOP;
  const GAP         = 5;

  const TABLE_COLS = [
    { label: 'SIZE',        key: 'size',       pct: 0.18 },
    { label: 'M.R.P. (₹)', key: 'mrp',        pct: 0.27 },
    { label: 'INNER PACK',  key: 'innerPack',  pct: 0.27 },
    { label: 'MASTER PACK', key: 'masterPack', pct: 0.28 },
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // CARD TYPE 1 — Single-column, full-detail card (every variant shown,
  // card height grows to fit; used for the "default"/fallback layout).
  // ═══════════════════════════════════════════════════════════════════════
  const PAD_SC       = 4;
  const ACCENT_W_SC  = 1.5;
  const IMG_W_SC     = 52;
  const ROW_H_SC     = 7;
  const HDR_H_SC     = 6;
  const NAME_H_SC    = 27;
  const IMG_MIN_H_SC = 50;

  const cardHeightFor = (product) => {
    const rowCount = Math.max(product.variants.length, 1);
    const contentH = NAME_H_SC + HDR_H_SC + rowCount * ROW_H_SC;
    return PAD_SC * 2 + Math.max(contentH, IMG_MIN_H_SC);
  };

  const drawSingleColumnCard = (product, x, y, w, h) => {
    const variants = product.variants || [];
    const tableX   = x + IMG_W_SC + PAD_SC * 2;
    const tableW   = w - IMG_W_SC - PAD_SC * 2 - PAD_SC;

    pdf.setFillColor(...C.blackSoftCard);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.25);
    pdf.rect(x, y, w, h, 'FD');

    pdf.setFillColor(...C.gold);
    pdf.rect(x, y, ACCENT_W_SC, h, 'F');

    const imgBoxX = x + ACCENT_W_SC + PAD_SC;
    const imgBoxY = y + PAD_SC;
    const imgBoxW = IMG_W_SC - ACCENT_W_SC - PAD_SC;
    const imgBoxH = h - PAD_SC * 2;

    pdf.setFillColor(...C.blackCard);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.2);
    pdf.rect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 'FD');

    const imgData = product.img ? imageCache[product.img] : null;
    if (imgData) {
      try {
        const props = pdf.getImageProperties(imgData);
        const ratio = props.width / props.height;
        let dw = imgBoxW - 2;
        let dh = dw / ratio;
        if (dh > imgBoxH - 2) { dh = imgBoxH - 2; dw = dh * ratio; }
        const dx = imgBoxX + 1 + (imgBoxW - 2 - dw) / 2;
        const dy = imgBoxY + 1 + (imgBoxH - 2 - dh) / 2;
        pdf.addImage(imgData, props.fileType || 'JPEG', dx, dy, dw, dh);
      } catch {
        t('PRODUCT',  imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 - 2, { size: 6, color: C.greyDark, align: 'center' });
        t('IMAGE',    imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 + 3, { size: 6, color: C.greyDark, align: 'center' });
      }
    } else {
      t('PRODUCT',  imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 - 2, { size: 6, color: C.greyDark, align: 'center' });
      t('IMAGE',    imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 + 3, { size: 6, color: C.greyDark, align: 'center' });
    }

    const nameX = tableX;
    const nameY = y + PAD_SC + 5;

    t(truncate(product.name, tableW - 2, 9, true), nameX, nameY, { size: 9, bold: true, color: C.gold });

    descriptionLines(product.description, tableW - 2, 5.5, 2).forEach((line, index) => {
      t(line, nameX, nameY + 10 + index * 3, { size: 5.5, color: C.greyLight });
    });
    const hsnVal = product.hsnCode    ? `HSN Code: ${product.hsnCode}` : 'HSN Code: —';
    const gstVal = product.gstPercent != null ? `  GST: ${product.gstPercent}%` : '  GST: —';
    t(hsnVal + gstVal, nameX, nameY + 18, { size: 5.5, color: C.greyMid });

    const tableStartY = y + PAD_SC + NAME_H_SC;

    pdf.setFillColor(...C.blackRow);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.15);
    pdf.rect(tableX, tableStartY, tableW, HDR_H_SC, 'FD');

    let cx = tableX;
    TABLE_COLS.forEach((col) => {
      t(col.label, cx + 1.5, tableStartY + 4.2, { size: 5.2, bold: true, color: C.greyMid });
      cx += tableW * col.pct;
    });

    let ry = tableStartY + HDR_H_SC;

    if (variants.length === 0) {
      pdf.setFillColor(...C.blackCard);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.1);
      pdf.rect(tableX, ry, tableW, ROW_H_SC, 'FD');
      t('No size data available', tableX + tableW / 2, ry + ROW_H_SC / 2 + 1.5, {
        size: 6, color: C.greyDark, align: 'center',
      });
    } else {
      variants.forEach((v, i) => {
        pdf.setFillColor(...(i % 2 === 0 ? C.blackCard : [248, 250, 252]));
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.1);
        pdf.rect(tableX, ry, tableW, ROW_H_SC, 'FD');

        let vx = tableX;
        TABLE_COLS.forEach((col) => {
          t(
            truncate(String(v[col.key] ?? '—'), tableW * col.pct - 2, 6),
            vx + 1.5,
            ry + ROW_H_SC / 2 + 1.5,
            { size: 6, color: C.greyLight }
          );
          vx += tableW * col.pct;
        });

        ry += ROW_H_SC;
      });
    }
  };

  // Flows single-column cards down the page, always starting on a fresh page.
  const renderSingleColumnGroup = (group) => {
    startNewPage();
    let curY = GRID_TOP;

    for (const product of group) {
      const cardH = cardHeightFor(product);

      if (curY + cardH > GRID_BOTTOM && curY > GRID_TOP) {
        startNewPage();
        curY = GRID_TOP;
      }

      drawSingleColumnCard(product, MARGIN, curY, USABLE, cardH);
      curY += cardH + GAP;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CARD TYPE 2 — Compact grid card (image on top, table below). Used for
  // dense grids (12/page and 9/page). Truncates rows with a "+N more" tag
  // when a product doesn't fit the fixed cell height.
  // ═══════════════════════════════════════════════════════════════════════
  const drawGridCard = (product, x, y, w, h) => {
    const PAD      = 2.5;
    const variants = product.variants || [];
    const innerH   = h - PAD * 2;

    pdf.setFillColor(...C.blackSoftCard);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.25);
    pdf.rect(x, y, w, h, 'FD');

    const NAME_H     = 15.5;
    const HDR_H      = 4.5;
    const MIN_ROW_H  = 3.6;
    const MAX_ROW_H  = 7;
    const IMG_MIN_H  = Math.max(h * 0.22, 14);
    const tableMaxH  = Math.max(innerH - NAME_H - IMG_MIN_H, HDR_H + MIN_ROW_H);
    const rowsBudget = tableMaxH - HDR_H;

    let rowH       = variants.length ? rowsBudget / variants.length : rowsBudget;
    let rowsToShow = variants.length;
    let showMore   = 0;

    if (variants.length === 0) {
      rowH = MIN_ROW_H;
    } else if (rowH < MIN_ROW_H) {
      rowsToShow = Math.max(1, Math.floor(rowsBudget / MIN_ROW_H) - 1);
      showMore   = variants.length - rowsToShow;
      rowH       = MIN_ROW_H;
    } else if (rowH > MAX_ROW_H) {
      rowH = MAX_ROW_H;
    }

    const tableRowsUsed = variants.length === 0 ? 1 : rowsToShow + (showMore > 0 ? 1 : 0);
    const tableBlockH   = HDR_H + rowH * tableRowsUsed;
    const imgH          = innerH - NAME_H - tableBlockH;

    const imgX = x + PAD;
    const imgY = y + PAD;
    const imgW = w - PAD * 2;

    pdf.setFillColor(...C.blackCard);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.2);
    pdf.rect(imgX, imgY, imgW, imgH, 'FD');

    const imgData = product.img ? imageCache[product.img] : null;
    if (imgData) {
      try {
        const props = pdf.getImageProperties(imgData);
        const ratio  = props.width / props.height;
        let dw = imgW - 1.6;
        let dh = dw / ratio;
        if (dh > imgH - 1.6) { dh = imgH - 1.6; dw = dh * ratio; }
        const dx = imgX + 0.8 + (imgW - 1.6 - dw) / 2;
        const dy = imgY + 0.8 + (imgH - 1.6 - dh) / 2;
        pdf.addImage(imgData, props.fileType || 'JPEG', dx, dy, dw, dh);
      } catch {
        t('NO IMAGE', imgX + imgW / 2, imgY + imgH / 2 + 1.5, { size: 6, color: C.greyDark, align: 'center' });
      }
    } else {
      t('NO IMAGE', imgX + imgW / 2, imgY + imgH / 2 + 1.5, { size: 6, color: C.greyDark, align: 'center' });
    }

    const nameY = imgY + imgH + 4;
    t(truncate(product.name, w - PAD * 2, 7, true), x + PAD, nameY, { size: 7, bold: true, color: C.gold });

    const description = descriptionLines(product.description, w - PAD * 2, 4.5, 1)[0];
    if (description) {
      t(description, x + PAD, nameY + 4, { size: 4.5, color: C.greyLight });
    }
    const hsnVal = product.hsnCode    ? `HSN ${product.hsnCode}` : 'HSN \u2014';
    const gstVal = product.gstPercent != null ? `GST ${product.gstPercent}%` : 'GST \u2014';
    t(`${hsnVal}   |   ${gstVal}`, x + PAD, nameY + 8, { size: 5.5, color: C.greyMid });

    const tableX = x + PAD;
    const tableW = w - PAD * 2;
    const tableY = nameY + 11.5;

    const cols = [
      { label: 'SIZE',  key: 'size',       w: 0.18 },
      { label: 'MRP',   key: 'mrp',        w: 0.27 },
      { label: 'INNER', key: 'innerPack',  w: 0.27 },
      { label: 'MSTR',  key: 'masterPack', w: 0.28 },
    ];

    pdf.setFillColor(...C.blackRow);
    pdf.rect(tableX, tableY, tableW, HDR_H, 'F');
    let cx = tableX;
    cols.forEach((col) => {
      t(col.label, cx + 1.2, tableY + 3.2, { size: 5, bold: true, color: C.greyMid });
      cx += tableW * col.w;
    });

    let ry = tableY + HDR_H;
    if (variants.length === 0) {
      t('No size data', tableX + 1.2, ry + rowH / 2 + 1, { size: 5.5, color: C.greyDark });
    } else {
      for (let i = 0; i < rowsToShow; i++) {
        const v = variants[i];
        pdf.setFillColor(...(i % 2 === 0 ? C.blackCard : [248, 250, 252]));
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.1);
        pdf.rect(tableX, ry, tableW, rowH, 'FD');
        let vx = tableX;
        cols.forEach((col) => {
          t(truncate(v[col.key], tableW * col.w - 1.5, 5.5), vx + 1.2, ry + rowH / 2 + 1.2, { size: 5.5, color: C.greyLight });
          vx += tableW * col.w;
        });
        ry += rowH;
      }
      if (showMore > 0) {
        pdf.setFillColor(...C.blackRow);
        pdf.rect(tableX, ry, tableW, rowH, 'F');
        t(`+${showMore} more size${showMore > 1 ? 's' : ''}`, tableX + tableW / 2, ry + rowH / 2 + 1.2, { size: 5.5, bold: true, color: C.gold, align: 'center' });
      }
    }
  };

  // Generic paginated grid renderer — used for 12/page (3x4) and 9/page (3x3).
  const renderGridGroup = (group, cols, rows) => {
    const perPage = cols * rows;
    const cellW   = (USABLE - GAP * (cols - 1)) / cols;
    const cellH   = (GRID_H - GAP * (rows - 1)) / rows;

    const totalPages = Math.ceil(group.length / perPage);
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      startNewPage();
      const chunk = group.slice(pageIdx * perPage, pageIdx * perPage + perPage);
      chunk.forEach((product, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx  = MARGIN + col * (cellW + GAP);
        const cy  = GRID_TOP + row * (cellH + GAP);
        drawGridCard(product, cx, cy, cellW, cellH);
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CARD TYPE 3 — Wide card (image left, name/HSN/GST + table right). Used
  // for 2/page and 1/page layouts, where each product gets a fixed, larger
  // slot. Rows auto-shrink to fit; if there truly isn't room (e.g. an
  // unusually large SKU count on the 1/page layout) a "+N more" row appears
  // so the card never overflows its slot.
  // ═══════════════════════════════════════════════════════════════════════
  const drawWideCard = (product, x, y, w, h, imgW) => {
    const PAD      = 4;
    const ACCENT_W = 1.5;
    const NAME_H   = 28;
    const HDR_H    = 7;
    const MIN_ROW_H = 6;
    const MAX_ROW_H = 10;

    const variants = product.variants || [];
    const tableX   = x + imgW + PAD * 2;
    const tableW   = w - imgW - PAD * 2 - PAD;

    pdf.setFillColor(...C.blackSoftCard);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.25);
    pdf.rect(x, y, w, h, 'FD');

    pdf.setFillColor(...C.gold);
    pdf.rect(x, y, ACCENT_W, h, 'F');

    // Image panel
    const imgBoxX = x + ACCENT_W + PAD;
    const imgBoxY = y + PAD;
    const imgBoxW = imgW - ACCENT_W - PAD;
    const imgBoxH = h - PAD * 2;

    pdf.setFillColor(...C.blackCard);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.2);
    pdf.rect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 'FD');

    const imgData = product.img ? imageCache[product.img] : null;
    if (imgData) {
      try {
        const props = pdf.getImageProperties(imgData);
        const ratio = props.width / props.height;
        let dw = imgBoxW - 2;
        let dh = dw / ratio;
        if (dh > imgBoxH - 2) { dh = imgBoxH - 2; dw = dh * ratio; }
        const dx = imgBoxX + 1 + (imgBoxW - 2 - dw) / 2;
        const dy = imgBoxY + 1 + (imgBoxH - 2 - dh) / 2;
        pdf.addImage(imgData, props.fileType || 'JPEG', dx, dy, dw, dh);
      } catch {
        t('PRODUCT',  imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 - 2, { size: 7, color: C.greyDark, align: 'center' });
        t('IMAGE',    imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 + 3, { size: 7, color: C.greyDark, align: 'center' });
      }
    } else {
      t('PRODUCT',  imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 - 2, { size: 7, color: C.greyDark, align: 'center' });
      t('IMAGE',    imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2 + 3, { size: 7, color: C.greyDark, align: 'center' });
    }

    // Name + HSN/GST
    const nameX = tableX;
    const nameY = y + PAD + 6;
    t(truncate(product.name, tableW - 2, 11, true), nameX, nameY, { size: 11, bold: true, color: C.gold });

    descriptionLines(product.description, tableW - 2, 5.5, 2).forEach((line, index) => {
      t(line, nameX, nameY + 10 + index * 3, { size: 5.5, color: C.greyLight });
    });
    const hsnVal = product.hsnCode    ? `HSN Code: ${product.hsnCode}` : 'HSN Code: —';
    const gstVal = product.gstPercent != null ? `  GST: ${product.gstPercent}%` : '  GST: —';
    t(hsnVal + gstVal, nameX, nameY + 18, { size: 6.5, color: C.greyMid });

    // Table — dynamically sized rows, with overflow tag if slot is too short
    const tableStartY   = y + PAD + NAME_H;
    const availableH    = (y + h - PAD) - tableStartY;
    const rowsBudget    = availableH - HDR_H;

    let rowH       = variants.length ? rowsBudget / variants.length : rowsBudget;
    let rowsToShow = variants.length;
    let showMore   = 0;

    if (variants.length === 0) {
      rowH = MIN_ROW_H;
    } else if (rowH < MIN_ROW_H) {
      rowsToShow = Math.max(1, Math.floor(rowsBudget / MIN_ROW_H) - 1);
      showMore   = variants.length - rowsToShow;
      rowH       = MIN_ROW_H;
    } else if (rowH > MAX_ROW_H) {
      rowH = MAX_ROW_H;
    }

    pdf.setFillColor(...C.blackRow);
    pdf.setDrawColor(...C.goldMuted);
    pdf.setLineWidth(0.15);
    pdf.rect(tableX, tableStartY, tableW, HDR_H, 'FD');

    let cx = tableX;
    TABLE_COLS.forEach((col) => {
      t(col.label, cx + 2, tableStartY + HDR_H / 2 + 1.5, { size: 6, bold: true, color: C.greyMid });
      cx += tableW * col.pct;
    });

    let ry = tableStartY + HDR_H;

    if (variants.length === 0) {
      pdf.setFillColor(...C.blackCard);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.1);
      pdf.rect(tableX, ry, tableW, rowH, 'FD');
      t('No size data available', tableX + tableW / 2, ry + rowH / 2 + 1.5, {
        size: 7, color: C.greyDark, align: 'center',
      });
    } else {
      for (let i = 0; i < rowsToShow; i++) {
        const v = variants[i];
        pdf.setFillColor(...(i % 2 === 0 ? C.blackCard : [248, 250, 252]));
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.1);
        pdf.rect(tableX, ry, tableW, rowH, 'FD');

        let vx = tableX;
        TABLE_COLS.forEach((col) => {
          t(
            truncate(String(v[col.key] ?? '—'), tableW * col.pct - 2, 7),
            vx + 2,
            ry + rowH / 2 + 1.5,
            { size: 7, color: C.greyLight }
          );
          vx += tableW * col.pct;
        });

        ry += rowH;
      }

      if (showMore > 0) {
        pdf.setFillColor(...C.blackRow);
        pdf.rect(tableX, ry, tableW, rowH, 'F');
        t(`+${showMore} more size${showMore > 1 ? 's' : ''}`, tableX + tableW / 2, ry + rowH / 2 + 1.5, {
          size: 7, bold: true, color: C.gold, align: 'center',
        });
      }
    }
  };

  // Generic paginated wide-card renderer — used for 2/page and 1/page.
  const renderWideGroup = (group, perPage) => {
    const slotH = perPage === 1 ? GRID_H : (GRID_H - GAP) / perPage;
    const imgW  = perPage === 1 ? 85 : 60;

    const totalPages = Math.ceil(group.length / perPage);
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      startNewPage();
      const chunk = group.slice(pageIdx * perPage, pageIdx * perPage + perPage);
      chunk.forEach((product, i) => {
        const cy = GRID_TOP + i * (slotH + GAP);
        drawWideCard(product, MARGIN, cy, USABLE, slotH, imgW);
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Bucket dispatch — group by SKU-count range, render each range on its
  // own fresh page(s), in order 1 → 2 → 3 → 4. Any range with ≤4 products
  // falls back to the single-column default layout instead of its grid/
  // wide-card layout.
  // ═══════════════════════════════════════════════════════════════════════
  const buckets = groupBySkuBucket(normalized);

  const bucketLayout = {
    1: (group) => renderGridGroup(group, 3, 4), // 12/page
    2: (group) => renderGridGroup(group, 3, 3), // 9/page
    3: (group) => renderWideGroup(group, 2),    // 2/page
    4: (group) => renderWideGroup(group, 1),    // 1/page
  };

  [1, 2, 3, 4].forEach((bucketNum) => {
    const group = buckets[bucketNum];
    if (!group.length) return;

    if (group.length <= 4) {
      renderSingleColumnGroup(group);
    } else {
      bucketLayout[bucketNum](group);
    }
  });

  stampFooters();
  return pdf;
}

// ── Base64 export for WhatsApp backend ───────────────────────────────────────
export async function generateProductSharePDFAsBase64(products) {
  const pdf  = await generateProductSharePDF(products);
  const blob = pdf.output('blob');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
  });
}