export function createSplash() {
    const wrapper = document.createElement('div');
    wrapper.id = 'application-splash-wrapper';

    const splash = document.createElement('div');
    splash.id = 'application-splash';

    const title = document.createElement('div');
    title.textContent = 'Loading Data...';

    const progressBarContainer = document.createElement('div');
    progressBarContainer.id = 'progress-bar-container';

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBarContainer.appendChild(progressBar);

    const progressText = document.createElement('div');
    progressText.id = 'progress-text';
    progressText.textContent = '0%';
    splash.appendChild(title);
    splash.appendChild(progressBarContainer);
    splash.appendChild(progressText);
    wrapper.appendChild(splash);
    document.body.appendChild(wrapper);
}

export function setSplashProgress(value) {
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    if (bar && text) {
        let percent = Math.floor(value * 100);
        if (!isFinite(percent) || isNaN(percent)) percent = 0;
        percent = Math.min(Math.max(percent, 0), 100);
        bar.style.width = percent + '%';
        text.textContent = percent + '%';
    }
}

export function hideSplash() {
    const splash = document.getElementById('application-splash-wrapper');
    if (splash) splash.remove();
}

export async function prewarmSOGS(metaUrl, onProgress) {
  const res = await fetch(metaUrl, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`SOGS meta fetch failed: ${res.status}`);
  const meta = await res.json();

  const base = metaUrl.slice(0, metaUrl.lastIndexOf('/') + 1);
  const urls = new Set();

  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string' && v.endsWith('.webp')) urls.add(base + v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(meta);

  ['means_l.webp','means_u.webp','quats.webp','scales.webp','sh0.webp','shN_centroids.webp','shN_labels.webp']
    .forEach(n => urls.add(base + n));

  const list = Array.from(urls);
  if (!list.length) return;

  const cache = await caches.open('sogs-prewarm-v1');
  let done = 0;
  for (const u of list) {
    try {
      const hit = await cache.match(u);
      if (!hit) {
        const r = await fetch(u, { credentials: 'same-origin' });
        if (r.ok) await cache.put(u, r.clone());
      }
    } catch (_) { }
    finally {
      done++;
      onProgress?.(done / list.length);
    }
  }
}

export async function loadAssets(app, assetList, onComplete, onProgress) {
    let totalBytes = assetList.reduce((sum, a) => sum + (a.size || 0), 0);
    let loadedBytes = 0;

    const bump = (delta) => {
        loadedBytes += delta;
        onProgress?.(Math.min(loadedBytes / Math.max(totalBytes, 1), 1));
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    let activeRequests = new Set();
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._url = url;
        return originalXHROpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
        if (this._url && assetList.some(({ asset }) => 
            asset.file?.url.includes(this._url) || this._url.includes(asset.name))) {
            
            let lastLoaded = 0;
            const request = this;
            
            this.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const delta = event.loaded - lastLoaded;
                    lastLoaded = event.loaded;
                    bump(delta);
                }
            });
            
            this.addEventListener('loadend', () => {
                activeRequests.delete(request);
            });
            
            activeRequests.add(this);
        }
        
        return originalXHRSend.call(this, ...args);
    };

    try {
        await Promise.all(assetList.map(async ({ asset, size }) => {
            if (!app.assets.get(asset.id)) {
                app.assets.add(asset);
            }
            
            await new Promise((resolve) => {
                asset.once('load', () => resolve());
                asset.once('error', (e) => {
                    console.error(`[${asset.type}] load error`, asset.name, e);
                    resolve();
                });
                app.assets.load(asset);
            });
        }));
        
        while (activeRequests.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } finally {
        XMLHttpRequest.prototype.open = originalXHROpen;
        XMLHttpRequest.prototype.send = originalXHRSend;
    }

    onProgress?.(1);
    onComplete?.();
}

async function fetchWithProgress(url, size, onChunk) {
    const response = await fetch(url);
    const reader = response.body?.getReader?.();
    if (!reader) {
        const ab = await response.arrayBuffer();
        onChunk?.(size || ab.byteLength || 0);
        return ab;
    }

    const chunks = [];
    let received = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        onChunk?.(value.length);
    }

    const blob = new Blob(chunks);
    return await blob.arrayBuffer();
}