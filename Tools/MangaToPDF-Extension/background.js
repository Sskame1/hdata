chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fetchImage") {
    (async () => {
      try {
        const resp = await fetch(msg.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const buffer = await blob.arrayBuffer();
        sendResponse({
          bytes: Array.from(new Uint8Array(buffer)),
          mimeType: blob.type || "image/jpeg",
        });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }
});
