async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function send(tag, data) {
  const tab = await getTab();
  if (!tab) throw new Error("No active tab");
  return chrome.tabs.sendMessage(tab.id, { action: tag, ...data });
}

const statusEl = document.getElementById("status");
const scanBtn = document.getElementById("scanBtn");
const manualBtn = document.getElementById("manualBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const qualityInput = document.getElementById("quality");
const qualityLabel = document.getElementById("qualityLabel");
const filenameInput = document.getElementById("filename");

let urls = [];
let referrer = "";
let manual = false;

function setStatus(text) { statusEl.innerHTML = text; }

function updateUI() {
  downloadBtn.disabled = urls.length === 0;
  clearBtn.disabled = urls.length === 0;
  manualBtn.textContent = manual ? "✏️ Выход из ручного" : "✏️ Ручной режим";
  setStatus(`Найдено <strong>${urls.length}</strong> ${declOfNum(urls.length, ["страница", "страницы", "страниц"])}`);
}

function declOfNum(n, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[n % 100 > 4 && n % 100 < 20 ? 2 : cases[n % 10 < 5 ? n % 10 : 5]];
}

qualityInput.addEventListener("input", () => {
  qualityLabel.textContent = qualityInput.value + "%";
});

scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = "⏳ Сканирую…";
  urls = [];
  referrer = "";
  manual = false;
  if (manual) await send("disableManual");
  try {
    const resp = await send("scan");
    urls = resp.urls || [];
    referrer = resp.referrer || "";
  } catch (e) {
    setStatus("❌ Ошибка: " + e.message);
  }
  scanBtn.disabled = false;
  scanBtn.textContent = "🔍 Сканировать страницу";
  updateUI();
});

manualBtn.addEventListener("click", async () => {
  manual = !manual;
  await send(manual ? "enableManual" : "disableManual");
  if (!manual) {
    const resp = await send("getState");
    urls = resp.urls || [];
    referrer = resp.referrer || "";
    updateUI();
  } else {
    setStatus("🖱 Кликай по страницам — добавить/убрать");
  }
});

clearBtn.addEventListener("click", async () => {
  urls = [];
  referrer = "";
  await send("clear");
  updateUI();
});

downloadBtn.addEventListener("click", async () => {
  if (urls.length === 0) return;
  downloadBtn.disabled = true;
  downloadBtn.textContent = "⏳ Генерирую PDF…";
  try {
    const quality = parseInt(qualityInput.value) / 100;
    let filename = filenameInput.value.trim() || "";
    if (!filename) {
      const tab = await getTab();
      filename = tab?.title?.replace(/[^a-zA-Zа-яА-Я0-9\-_ ]/g, "").trim().slice(0, 100) || "manga";
    }
    const resp = await send("generatePDF", { quality, filename });
    if (resp?.status === "success") {
      setStatus("✅ PDF генерируется, скачивание…");
    } else {
      setStatus("❌ " + (resp?.error || "unknown error"));
    }
  } catch (e) {
    setStatus("❌ " + e.message);
  }
  downloadBtn.disabled = false;
  downloadBtn.textContent = "📥 PDF";
});

(async () => {
  try {
    const resp = await send("getState");
    urls = resp.urls || [];
    referrer = resp.referrer || "";
    manual = resp.manual || false;
  } catch {}
  updateUI();
})();
