/**
 * BitDNS Chrome Extension - Background Service Worker
 * Intercepts DNS errors for .bit domains and redirects to resolved addresses.
 */

const DEFAULT_API_URL = "http://localhost:3008";
const dnsCache = new Map();
const CACHE_TTL = 300000;

async function getApiUrl() {
  const result = await chrome.storage.local.get(["apiUrl"]);
  return result.apiUrl || DEFAULT_API_URL;
}

async function resolveDomain(domain) {
  if (!domain.endsWith('.bit')) domain += '.bit';
  
  const cached = dnsCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[BitDNS] Cache: ${domain} -> ${cached.value}`);
    return cached;
  }

  const apiUrl = await getApiUrl();
  console.log(`[BitDNS] Resolving ${domain} via ${apiUrl}`);

  try {
    const response = await fetch(`${apiUrl}/resolve/${encodeURIComponent(domain)}`);
    if (!response.ok) return null;

    const data = await response.json();
    
    const aRecord = data.records?.find(r => r.record_type === "A");
    if (aRecord) {
      const result = { value: aRecord.value, type: 'A', timestamp: Date.now() };
      dnsCache.set(domain, result);
      updateStats(domain, aRecord.value);
      return result;
    }

    const cnameRecord = data.records?.find(r => r.record_type === "CNAME");
    if (cnameRecord) {
      const result = { value: cnameRecord.value, type: 'CNAME', timestamp: Date.now() };
      dnsCache.set(domain, result);
      updateStats(domain, cnameRecord.value);
      return result;
    }

    return null;
  } catch (error) {
    console.error(`[BitDNS] Error:`, error);
    return null;
  }
}

async function updateStats(domain, target) {
  const result = await chrome.storage.local.get(["stats"]);
  const stats = result.stats || { resolved: 0, domains: {} };
  stats.resolved++;
  stats.domains[domain] = { ip: target, lastResolved: Date.now(), count: (stats.domains[domain]?.count || 0) + 1 };
  await chrome.storage.local.set({ stats });
}

// IMPORTANT: Use onErrorOccurred to catch DNS failures
chrome.webNavigation.onErrorOccurred.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (details.error !== "net::ERR_NAME_NOT_RESOLVED") return;
  
  let url;
  try {
    url = new URL(details.url);
  } catch {
    return;
  }
  
  if (!url.hostname.endsWith(".bit")) return;
  
  console.log(`[BitDNS] DNS failed for ${url.hostname}, resolving...`);
  
  const resolved = await resolveDomain(url.hostname);
  
  if (resolved) {
    let newUrl;
    if (resolved.type === 'CNAME') {
      newUrl = `https://${resolved.value}${url.pathname}${url.search}`;
    } else {
      newUrl = `http://${resolved.value}${url.pathname}${url.search}`;
    }
    
    console.log(`[BitDNS] Redirecting to ${newUrl}`);
    chrome.tabs.update(details.tabId, { url: newUrl });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "resolve") {
    resolveDomain(message.domain).then(r => sendResponse({ ip: r?.value }));
    return true;
  }
  if (message.type === "clearCache") {
    dnsCache.clear();
    sendResponse({ success: true });
    return true;
  }
  if (message.type === "getStats") {
    chrome.storage.local.get(["stats"]).then(r => sendResponse(r.stats || { resolved: 0, domains: {} }));
    return true;
  }
});

console.log("[BitDNS] Extension loaded - using onErrorOccurred!");
