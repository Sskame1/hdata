const state = {
  manual: false,
  urls: [],
  referrer: "",
  scanned: false,
};

function resolveUrl(img) {
  return img.getAttribute("data-src")
    || img.getAttribute("data-srcset")?.split(/\s+/)[0]
    || img.getAttribute("src")
    || "";
}

function isMangaCandidate(img) {
  const url = resolveUrl(img);
  if (!url || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("chrome-extension://")) return false;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (w < 300 || h < 300) return false;
  return true;
}

function findContainer() {
  const candidates = document.querySelectorAll(
    ".container-chapter-reader, .reader-container, .read-content, "
    + ".page-container, [class*=reader], [class*=manga], [class*=chapter], "
    + ".comic-page, #reader, .viewer-container"
  );
  if (candidates.length) {
    for (const el of candidates) {
      const imgs = el.querySelectorAll("img");
      if (imgs.length >= 3) return el;
    }
  }
  const all = [...document.querySelectorAll("img")].filter(isMangaCandidate);
  if (all.length <= 5) return document.body;
  const mid = all[Math.floor(all.length / 2)];
  if (!mid) return document.body;
  let container = mid.closest("div, section, main, article");
  while (container && container !== document.body) {
    const kids = container.querySelectorAll("img");
    if (kids.length >= all.length * 0.7 && kids.length >= 3) return container;
    container = container.parentElement?.closest("div, section, main, article") || document.body;
  }
  return document.body;
}

function collectFromContainer(container, existing) {
  const seen = new Set(existing);
  const imgs = [...container.querySelectorAll("img")].filter(isMangaCandidate);
  const items = [];
  for (const img of imgs) {
    const url = resolveUrl(img);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const rect = img.getBoundingClientRect();
    items.push({ url, top: rect.top + window.scrollY, left: rect.left + window.scrollX, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
  }
  items.sort((a, b) => a.top - b.top || a.left - b.left);
  return items;
}

async function autoScroll(container) {
  const scrollStep = window.innerHeight * 0.8;
  const maxScroll = Math.max(document.body.scrollHeight, container.scrollHeight);
  const seenUrls = new Set();
  let lastCount = 0;
  for (let pos = 0; pos < maxScroll; pos += scrollStep) {
    window.scrollTo(0, pos);
    await new Promise((r) => setTimeout(r, 800));
    const imgs = [...container.querySelectorAll("img")].filter(isMangaCandidate);
    if (imgs.length > lastCount) lastCount = imgs.length;
    else if (pos > 0) break;
  }
  window.scrollTo(0, 0);
  await new Promise((r) => requestAnimationFrame(r));
}

function markImages(container, urls) {
  const imgs = container.querySelectorAll("img");
  for (const img of imgs) {
    const url = resolveUrl(img);
    if (urls.includes(url)) {
      img.dataset.mangaSel = urls.indexOf(url) + 1;
      img.style.outline = "3px solid #22c55e";
      img.style.outlineOffset = "1px";
    } else {
      delete img.dataset.mangaSel;
      img.style.outline = "";
      img.style.outlineOffset = "";
    }
  }
}

function clearMarkup() {
  for (const img of document.querySelectorAll("img")) {
    img.style.outline = "";
    img.style.outlineOffset = "";
    img.style.cursor = "";
    delete img.dataset.mangaSel;
  }
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === "scan") {
    return (async () => {
      const container = findContainer();
      await autoScroll(container);
      const items = collectFromContainer(container, []);
      state.urls = items.map((i) => i.url);
      state.referrer = document.URL;
      state.scanned = true;
      markImages(container, state.urls);
      return { count: state.urls.length, urls: state.urls, referrer: document.URL };
    })();
  }

  if (msg.action === "getState") {
    return { urls: state.urls, manual: state.manual, scanned: state.scanned, referrer: state.referrer };
  }

  if (msg.action === "enableManual") {
    state.manual = true;
    for (const img of document.querySelectorAll("img")) {
      img.style.cursor = "crosshair";
    }
    return { status: "ok" };
  }

  if (msg.action === "disableManual") {
    state.manual = false;
    for (const img of document.querySelectorAll("img")) {
      img.style.cursor = "";
    }
    return { status: "ok" };
  }

  if (msg.action === "clear") {
    state.urls = [];
    state.referrer = "";
    state.scanned = false;
    clearMarkup();
    return { status: "ok" };
  }

  if (msg.action === "removeUrl") {
    state.urls = state.urls.filter((u) => u !== msg.url);
    const container = findContainer();
    markImages(container, state.urls);
    return { count: state.urls.length };
  }

  if (msg.action === "generatePDF") {
    return (async () => {
      try {
        await generatePDF(msg.quality ?? 0.92, msg.filename || "manga");
        return { status: "success" };
      } catch (err) {
        return { status: "error", error: err.message };
      }
    })();
  }
});

document.addEventListener("click", (e) => {
  if (!state.manual) return;
  const img = e.target.closest("img");
  if (!img) return;
  e.preventDefault();
  e.stopPropagation();
  const url = resolveUrl(img);
  if (!url) return;
  const idx = state.urls.indexOf(url);
  if (idx === -1) {
    state.urls.push(url);
  } else {
    state.urls.splice(idx, 1);
  }
  const container = findContainer();
  markImages(container, state.urls);
});

async function fetchViaBackground(url) {
  const resp = await browser.runtime.sendMessage({ action: "fetchImage", url }).catch(() => null);
  if (!resp || resp.error || !resp.bytes) return null;
  const uint8 = new Uint8Array(resp.bytes);
  return new Blob([uint8], { type: resp.mimeType || "image/jpeg" });
}

async function generatePDF(quality, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  let first = true;

  for (let i = 0; i < state.urls.length; i++) {
    const url = state.urls[i];
    const blob = await fetchViaBackground(url);
    if (!blob) continue;
    const dataUrl = await blobToDataUrl(blob);
    const img = await loadImage(dataUrl);

    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const ir = img.width / img.height;
    const pr = pw / ph;
    let fw, fh, ox, oy;
    if (ir > pr) {
      fw = pw; fh = pw / ir; ox = 0; oy = (ph - fh) / 2;
    } else {
      fh = ph; fw = ph * ir; ox = (pw - fw) / 2; oy = 0;
    }
    if (!first) doc.addPage();
    first = false;
    const fmt = blob.type === "image/png" ? "PNG" : "JPEG";
    doc.addImage(dataUrl, fmt, ox, oy, fw, fh, undefined, quality === 1 ? "FAST" : quality);
  }

  if (first) throw new Error("Не удалось загрузить ни одной картинки");
  const pdfBlob = doc.output("blob");
  downloadBlob(pdfBlob, filename + ".pdf");
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}
