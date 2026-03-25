(function () {
  function getToken() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("token") || localStorage.admin_token || "";
  }

  function postSize() {
    try {
      const matrix = document.querySelector(".matrix");
      if (!matrix) return;
      const rect = matrix.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const paddedWidth = rect.width + 80;
      const paddedHeight = rect.height + 90;
      window.parent.postMessage(
        { type: "sim:size", width: Math.round(paddedWidth), height: Math.round(paddedHeight) },
        "*"
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function tick() {
    try {
      const res = await fetch("/sim", { headers: { Authorization: "Bearer " + getToken() } });
      const data = await res.json();
      const text = data.text || "Waiting...";
      const style = data.style || {};
      let color;
      if (Array.isArray(style.colors) && style.colors.length > 0) {
        const first = style.colors[0];
        if (Array.isArray(first) && first.length > 0) {
          color = first[0];
        } else if (typeof first === "string") {
          color = first;
        }
      }
      if (!color) {
        color = style.color;
      }
      const el = document.getElementById("text");
      const debug = document.getElementById("debug");
      if (el) {
        el.textContent = text;
        el.style.color = color || "#e6f0ff";
      }
      if (debug) {
        debug.textContent = JSON.stringify({ color, style }, null, 2);
      }
    } catch (err) {
      console.error(err);
    }
  }

  tick();
  setInterval(tick, 1000);
  setTimeout(postSize, 50);
  setInterval(postSize, 1000);
  window.addEventListener("resize", postSize);
})();
