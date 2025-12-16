const DEFAULT_API_URL = "http://localhost:3008";

const domainInput = document.getElementById("domainInput");
const resolveBtn = document.getElementById("resolveBtn");
const resultDiv = document.getElementById("result");
const resolvedCount = document.getElementById("resolvedCount");
const domainCount = document.getElementById("domainCount");
const recentList = document.getElementById("recentList");
const apiUrlInput = document.getElementById("apiUrl");
const saveBtn = document.getElementById("saveBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");

async function init() {
  const settings = await chrome.storage.local.get(["apiUrl"]);
  apiUrlInput.value = settings.apiUrl || DEFAULT_API_URL;
  await loadStats();
  
  resolveBtn.addEventListener("click", handleResolve);
  domainInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleResolve(); });
  saveBtn.addEventListener("click", handleSave);
  clearCacheBtn.addEventListener("click", handleClearCache);
}

async function handleResolve() {
  let domain = domainInput.value.trim();
  if (!domain) return;
  if (!domain.endsWith(".bit")) domain += ".bit";

  resolveBtn.disabled = true;
  resolveBtn.textContent = "...";
  resultDiv.style.display = "none";

  try {
    const response = await chrome.runtime.sendMessage({ type: "resolve", domain });
    resultDiv.style.display = "block";
    if (response.ip) {
      resultDiv.className = "result success";
      resultDiv.innerHTML = `<strong>${domain}</strong><br>→ ${response.ip}`;
    } else {
      resultDiv.className = "result error";
      resultDiv.textContent = `Domain not found: ${domain}`;
    }
    await loadStats();
  } catch (error) {
    resultDiv.style.display = "block";
    resultDiv.className = "result error";
    resultDiv.textContent = `Error: ${error.message}`;
  } finally {
    resolveBtn.disabled = false;
    resolveBtn.textContent = "Resolve";
  }
}

async function loadStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: "getStats" });
    resolvedCount.textContent = stats.resolved || 0;
    domainCount.textContent = Object.keys(stats.domains || {}).length;
    
    const domains = stats.domains || {};
    const sorted = Object.entries(domains).sort((a, b) => b[1].lastResolved - a[1].lastResolved).slice(0, 5);
    
    if (sorted.length > 0) {
      recentList.innerHTML = sorted.map(([domain, info]) => `
        <div class="recent-item">
          <span class="domain">${domain}</span>
          <span class="ip">${info.ip}</span>
        </div>
      `).join("");
    } else {
      recentList.innerHTML = `<div class="recent-item"><span class="domain">No recent lookups</span></div>`;
    }
  } catch (error) {
    console.error("Failed to load stats:", error);
  }
}

async function handleSave() {
  const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
  await chrome.storage.local.set({ apiUrl });
  saveBtn.textContent = "Saved!";
  setTimeout(() => { saveBtn.textContent = "Save"; }, 1500);
}

async function handleClearCache() {
  await chrome.runtime.sendMessage({ type: "clearCache" });
  await chrome.storage.local.set({ stats: { resolved: 0, domains: {} } });
  clearCacheBtn.textContent = "Cleared!";
  await loadStats();
  setTimeout(() => { clearCacheBtn.textContent = "Clear Cache"; }, 1500);
}

document.addEventListener("DOMContentLoaded", init);
