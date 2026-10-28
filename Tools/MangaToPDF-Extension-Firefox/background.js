browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === "fetchImage") {
    return (async () => {
      try {
        const resp = await fetch(msg.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const buffer = await blob.arrayBuffer();
        return {
          bytes: Array.from(new Uint8Array(buffer)),
          mimeType: blob.type || "image/jpeg",
        };
      } catch (err) {
        return { error: err.message };
      }
    })();
  }
});
