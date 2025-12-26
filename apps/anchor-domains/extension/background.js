/**
 * Anchor Domains Chrome Extension - Background Service Worker
 *
 * Intercepts requests to .btc, .sat, .anchor, .anc domains and resolves them using the Anchor Domains API.
 */

// Default API URL (can be configured in popup)
const DEFAULT_API_URL = 'http://localhost:3401';

// Supported TLDs
const SUPPORTED_TLDS = ['.btc', '.sat', '.anchor', '.anc', '.bit'];

// Cache for DNS lookups
const dnsCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

/**
 * Get the API URL from storage
 */
async function getApiUrl() {
  const result = await chrome.storage.local.get(['apiUrl']);
  return result.apiUrl || DEFAULT_API_URL;
}

/**
 * Check if a hostname ends with a supported TLD
 */
function getSupportedTld(hostname) {
  const lowerHostname = hostname.toLowerCase();
  for (const tld of SUPPORTED_TLDS) {
    if (lowerHostname.endsWith(tld)) {
      return tld;
    }
  }
  return null;
}

/**
 * Check if a URL is an Anchor Domains domain
 */
function isAnchorDomain(url) {
  try {
    const parsed = new URL(url);
    return getSupportedTld(parsed.hostname) !== null;
  } catch {
    return false;
  }
}

/**
 * Resolve an Anchor Domains domain to an IP address
 */
async function resolveDomain(domain) {
  // Check cache first
  const cached = dnsCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[AnchorDomains] Cache hit for ${domain}`);
    return cached.ip;
  }

  const apiUrl = await getApiUrl();
  console.log(`[AnchorDomains] Resolving ${domain} via ${apiUrl}`);

  try {
    const response = await fetch(`${apiUrl}/resolve/${encodeURIComponent(domain)}`);

    if (!response.ok) {
      console.log(`[AnchorDomains] Domain not found: ${domain}`);
      return null;
    }

    const data = await response.json();

    // Find A record (IPv4)
    const aRecord = data.records?.find((r) => r.record_type === 'A');
    if (aRecord) {
      console.log(`[AnchorDomains] Resolved ${domain} to ${aRecord.value}`);

      // Cache the result
      dnsCache.set(domain, {
        ip: aRecord.value,
        timestamp: Date.now(),
        ttl: aRecord.ttl,
      });

      // Update stats
      await updateStats(domain, aRecord.value);

      return aRecord.value;
    }

    // Try AAAA record (IPv6)
    const aaaaRecord = data.records?.find((r) => r.record_type === 'AAAA');
    if (aaaaRecord) {
      console.log(`[AnchorDomains] Resolved ${domain} to ${aaaaRecord.value} (IPv6)`);

      dnsCache.set(domain, {
        ip: aaaaRecord.value,
        timestamp: Date.now(),
        ttl: aaaaRecord.ttl,
      });

      await updateStats(domain, aaaaRecord.value);

      return aaaaRecord.value;
    }

    // Try CNAME record
    const cnameRecord = data.records?.find((r) => r.record_type === 'CNAME');
    if (cnameRecord) {
      console.log(`[AnchorDomains] CNAME ${domain} -> ${cnameRecord.value}`);
      return cnameRecord.value;
    }

    console.log(`[AnchorDomains] No A/AAAA/CNAME record found for ${domain}`);
    return null;
  } catch (error) {
    console.error(`[AnchorDomains] Error resolving ${domain}:`, error);
    return null;
  }
}

/**
 * Update resolution statistics
 */
async function updateStats(domain, ip) {
  const result = await chrome.storage.local.get(['stats']);
  const stats = result.stats || { resolved: 0, domains: {} };

  stats.resolved++;
  stats.domains[domain] = {
    ip,
    lastResolved: Date.now(),
    count: (stats.domains[domain]?.count || 0) + 1,
  };

  await chrome.storage.local.set({ stats });
}

/**
 * Handle navigation to Anchor Domains
 */
chrome.webNavigation?.onBeforeNavigate?.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only handle main frame

  if (!isAnchorDomain(details.url)) return;

  try {
    const url = new URL(details.url);
    const domain = url.hostname;

    console.log(`[AnchorDomains] Intercepting navigation to ${domain}`);

    const ip = await resolveDomain(domain);

    if (ip) {
      // Check if it's another domain (CNAME) or IP
      const isIp = /^[\d.:]+$/.test(ip);

      if (isIp) {
        // Replace hostname with IP
        url.hostname = ip;
        console.log(`[AnchorDomains] Redirecting to ${url.href}`);

        chrome.tabs.update(details.tabId, { url: url.href });
      } else {
        // It's a CNAME, redirect to the target domain
        url.hostname = ip;
        console.log(`[AnchorDomains] Redirecting via CNAME to ${url.href}`);

        chrome.tabs.update(details.tabId, { url: url.href });
      }
    } else {
      // Show error page
      console.log(`[AnchorDomains] Domain not found: ${domain}`);
    }
  } catch (error) {
    console.error('[AnchorDomains] Navigation error:', error);
  }
});

/**
 * Listen for messages from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'resolve') {
    resolveDomain(message.domain).then((ip) => {
      sendResponse({ ip });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'clearCache') {
    dnsCache.clear();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'getStats') {
    chrome.storage.local.get(['stats']).then((result) => {
      sendResponse(result.stats || { resolved: 0, domains: {} });
    });
    return true;
  }
});

/**
 * Omnibox - Handle "dom" keyword in address bar
 * User types: "dom miguel.btc" -> resolves miguel.btc
 */
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  let domain = text.trim();

  // If no TLD, add .btc as default
  const hasTld = getSupportedTld(domain) !== null;
  if (!hasTld) {
    domain += '.btc';
  }

  console.log(`[AnchorDomains] Omnibox: resolving ${domain}`);

  const resolved = await resolveDomain(domain);

  let targetUrl;
  if (resolved) {
    // Check if it's an IP or domain (CNAME)
    const isIp = /^[\d.:]+$/.test(resolved);
    if (isIp) {
      targetUrl = `http://${resolved}`;
    } else {
      // CNAME - redirect to the target domain
      targetUrl = resolved.startsWith('http') ? resolved : `https://${resolved}`;
    }
  } else {
    // Domain not found - show error or go to registration page
    const apiUrl = await getApiUrl();
    const baseUrl = apiUrl.replace(/:\d+$/, ':3400'); // Frontend port
    const tld = getSupportedTld(domain) || '.btc';
    const nameWithoutTld = domain.slice(0, -tld.length);
    targetUrl = `${baseUrl}/register?domain=${encodeURIComponent(nameWithoutTld)}`;
  }

  console.log(`[AnchorDomains] Omnibox: navigating to ${targetUrl}`);

  // Handle disposition (how the URL should be opened)
  switch (disposition) {
    case 'currentTab':
      chrome.tabs.update({ url: targetUrl });
      break;
    case 'newForegroundTab':
      chrome.tabs.create({ url: targetUrl });
      break;
    case 'newBackgroundTab':
      chrome.tabs.create({ url: targetUrl, active: false });
      break;
  }
});

// Provide suggestions as user types
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const domain = text.trim();
  if (!domain) return;

  // Check if domain already has a TLD
  const hasTld = getSupportedTld(domain) !== null;

  if (hasTld) {
    suggest([
      {
        content: domain,
        description: `Go to <match>${domain}</match> (Anchor Domains)`,
      },
    ]);
  } else {
    // Suggest all TLDs
    const suggestions = SUPPORTED_TLDS.map((tld) => ({
      content: `${domain}${tld}`,
      description: `Go to <match>${domain}${tld}</match> (Anchor Domains)`,
    }));
    suggest(suggestions);
  }
});

// Set default suggestion
chrome.omnibox.setDefaultSuggestion({
  description: 'Type a domain to resolve (e.g., mysite.btc, mysite.sat)',
});

console.log('[AnchorDomains] Extension loaded - Supported TLDs:', SUPPORTED_TLDS.join(', '));
