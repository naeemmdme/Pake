/*
 * Minimal Greasemonkey/Tampermonkey compatibility layer for vBlockTube in Pake.
 * This does NOT bypass browser CORS: GM_xmlhttpRequest uses page-context XHR.
 */
(() => {
  "use strict";
  const PREFIX = "__pake_vbt__:";
  const listeners = new Map();
  let nextListenerId = 1;

  const parse = (raw, fallback) => {
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  };

  const getValue = (key, fallback) => {
    try {
      const raw = localStorage.getItem(PREFIX + String(key));
      return raw === null ? fallback : parse(raw, fallback);
    } catch (error) {
      console.warn("[Pake vBlockTube] storage read failed", error);
      return fallback;
    }
  };

  const setValue = (key, value) => {
    const name = String(key);
    const oldValue = getValue(name, undefined);
    try {
      if (value === undefined) localStorage.removeItem(PREFIX + name);
      else localStorage.setItem(PREFIX + name, JSON.stringify(value));
    } catch (error) {
      console.warn("[Pake vBlockTube] storage write failed", error);
      return;
    }
    const newValue = getValue(name, undefined);
    window.dispatchEvent(new CustomEvent("__pake_vbt_value_change__", {
      detail: { key: name, oldValue, newValue, remote: false }
    }));
  };

  const addValueChangeListener = (key, callback) => {
    const id = nextListenerId++;
    const name = String(key);
    const handler = (event) => {
      const d = event.detail;
      if (d?.key === name) {
        try { callback(name, d.oldValue, d.newValue, !!d.remote); }
        catch (error) { console.error("[Pake vBlockTube] value listener failed", error); }
      }
    };
    listeners.set(id, handler);
    window.addEventListener("__pake_vbt_value_change__", handler);
    return id;
  };

  const removeValueChangeListener = (id) => {
    const handler = listeners.get(id);
    if (handler) {
      window.removeEventListener("__pake_vbt_value_change__", handler);
      listeners.delete(id);
    }
  };

  window.addEventListener("storage", (event) => {
    if (!event.key?.startsWith(PREFIX)) return;
    window.dispatchEvent(new CustomEvent("__pake_vbt_value_change__", {
      detail: {
        key: event.key.slice(PREFIX.length),
        oldValue: parse(event.oldValue, undefined),
        newValue: parse(event.newValue, undefined),
        remote: true
      }
    }));
  });

  const request = (details = {}) => {
    let xhr;
    try {
      xhr = new XMLHttpRequest();
      xhr.open(String(details.method || "GET").toUpperCase(), details.url, true);
      if (details.timeout) xhr.timeout = Number(details.timeout);
      if (details.responseType) {
        try { xhr.responseType = details.responseType; } catch {}
      }
      if (details.withCredentials) xhr.withCredentials = true;
      for (const [name, value] of Object.entries(details.headers || {})) {
        try { xhr.setRequestHeader(name, value); } catch {}
      }

      const result = () => ({
        readyState: xhr.readyState,
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: (() => { try { return xhr.responseText; } catch { return ""; } })(),
        response: xhr.response,
        responseURL: xhr.responseURL,
        finalUrl: xhr.responseURL,
        responseHeaders: xhr.getAllResponseHeaders()
      });

      xhr.onload = () => details.onload?.(result());
      xhr.onerror = () => details.onerror?.(result());
      xhr.ontimeout = () => details.ontimeout?.(result());
      xhr.onabort = () => details.onabort?.(result());
      xhr.onreadystatechange = () => details.onreadystatechange?.(result());
      xhr.send(details.data ?? null);
    } catch (error) {
      queueMicrotask(() => details.onerror?.({
        status: 0, statusText: String(error), responseText: "", response: null
      }));
    }
    return {
      abort: () => { try { xhr?.abort(); } catch {} },
      get readyState() { return xhr?.readyState ?? 0; },
      get status() { return xhr?.status ?? 0; }
    };
  };

  const api = {
    GM_getValue: getValue,
    GM_setValue: setValue,
    GM_deleteValue: (key) => setValue(key, undefined),
    GM_listValues: () => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length));
      }
      return keys;
    },
    GM_addValueChangeListener: addValueChangeListener,
    GM_removeValueChangeListener: removeValueChangeListener,
    GM_xmlhttpRequest: request,
    GM_setClipboard: (value) => navigator.clipboard.writeText(String(value ?? "")),
    GM_download: (details = {}) => {
      const a = document.createElement("a");
      a.href = String(details.url || "");
      a.download = String(details.name || "");
      a.rel = "noopener";
      a.style.display = "none";
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
      queueMicrotask(() => details.onload?.({ success: true }));
    },
    GM_info: {
      script: {
        name: "vBlockTube (Pake compatibility build)",
        version: "2.1.0",
        namespace: "https://github.com/vippium/vBlockTube"
      },
      scriptHandler: "Pake compatibility layer",
      version: "1.0.0"
    }
  };

  for (const [name, value] of Object.entries(api)) {
    try {
      Object.defineProperty(globalThis, name, {
        configurable: true, enumerable: false, writable: false, value
      });
    } catch (error) {
      console.error("[Pake vBlockTube] Could not install", name, error);
    }
  }

  try {
    Object.defineProperty(globalThis, "unsafeWindow", {
      configurable: true, enumerable: false, get: () => globalThis
    });
  } catch {}

  console.info("[Pake vBlockTube] compatibility layer ready");
})();
