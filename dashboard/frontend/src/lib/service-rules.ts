// Service incompatibilities and dependencies for Anchor OS installation

export type InstallationPreset = "minimum" | "default" | "full" | "custom";

export type ServiceInstallStatus =
  | "not_installed"
  | "installed"
  | "installing"
  | "failed";

export type ServiceCategory =
  | "core"
  | "explorer"
  | "networking"
  | "monitoring"
  | "app"
  | "dashboard";

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  dockerProfiles: string[];
  containers: string[];
  installStatus: ServiceInstallStatus;
  enabled: boolean;
  required: boolean;
  incompatibleWith: string[];
  dependsOn: string[];
}

export interface PresetInfo {
  id: InstallationPreset;
  name: string;
  description: string;
  services: string[];
  warning?: string;
}

// Service incompatibility rules (bidirectional)
export const incompatibilities: Record<string, string[]> = {
  "core-electrs": ["core-fulcrum"],
  "core-fulcrum": ["core-electrs"],
};

// Service dependency rules
export const dependencies: Record<string, string[]> = {
  "core-electrs": ["core-bitcoin"],
  "core-fulcrum": ["core-bitcoin"],
  "core-indexer": ["core-bitcoin", "core-postgres"],
  "core-wallet": ["core-bitcoin"],
  "core-testnet": ["core-wallet", "core-indexer"],
  "explorer-mempool": ["core-bitcoin", "core-electrs"],
  "explorer-btc-rpc": ["core-bitcoin"],
  "explorer-bitfeed": ["core-bitcoin"],
  "anchor-dashboard": ["core-bitcoin", "core-postgres"],
  "app-threads": ["core-postgres", "core-wallet"],
  "app-canvas": ["core-postgres", "core-bitcoin", "core-wallet"],
  "app-places": ["core-postgres", "core-bitcoin", "core-wallet"],
  "app-domains": ["core-postgres", "core-bitcoin", "core-wallet"],
  "app-proof": ["core-postgres", "core-bitcoin", "core-wallet"],
  "app-tokens": ["core-postgres", "core-bitcoin", "core-wallet"],
  "app-oracles": ["core-bitcoin"],
  "app-predictions": ["core-bitcoin", "app-oracles"],
};

// Required services that cannot be uninstalled
export const requiredServices = [
  "core-bitcoin",
  "core-postgres",
  "core-indexer",
  "core-wallet",
  "core-testnet",
  "anchor-dashboard",
];

// At least one of these electrum servers must be installed
export const electrumServers = ["core-electrs", "core-fulcrum"];

// Check if a service is required (cannot be uninstalled)
export function isRequiredService(serviceId: string, installedServices?: string[]): boolean {
  // Core required services
  if (requiredServices.includes(serviceId)) {
    return true;
  }
  
  // Electrum server rule: at least one must be installed
  if (electrumServers.includes(serviceId) && installedServices) {
    const installedElectrumServers = electrumServers.filter(s => installedServices.includes(s));
    // If only one electrum server is installed, it's required
    if (installedElectrumServers.length === 1 && installedElectrumServers[0] === serviceId) {
      return true;
    }
  }
  
  return false;
}

// Map app IDs to service IDs (for installation system)
export const appToServiceMap: Record<string, string> = {
  // Core
  "core-bitcoin": "core-bitcoin",
  "core-postgres": "core-postgres",
  "core-electrs": "core-electrs",
  "core-fulcrum": "core-fulcrum",
  "core-indexer": "core-indexer",
  "core-wallet": "core-wallet",
  "core-testnet": "core-testnet",
  // Explorers
  "explorer-mempool": "explorer-mempool",
  "explorer-btc-rpc": "explorer-btc-rpc",
  "explorer-bitfeed": "explorer-bitfeed",
  // Networking
  "networking-tailscale": "networking-tailscale",
  "networking-cloudflare": "networking-cloudflare",
  "networking-tor": "networking-tor",
  // Monitoring
  "monitoring-netdata": "monitoring-netdata",
  // Dashboard
  "anchor-dashboard": "anchor-dashboard",
  // Apps
  "app-domains": "app-domains",
  "app-predictions": "app-predictions",
  "app-places": "app-places",
  "app-oracles": "app-oracles",
  "app-canvas": "app-canvas",
  "app-proof": "app-proof",
  "app-threads": "app-threads",
  "app-tokens": "app-tokens",
};

// Get service ID from app ID
export function getServiceIdFromAppId(appId: string): string {
  return appToServiceMap[appId] || appId;
}

// Preset definitions
export const presets: PresetInfo[] = [
  {
    id: "minimum",
    name: "Minimum",
    description:
      "Essential services only - Bitcoin node, Fulcrum, and BTC RPC Explorer. Lowest resource usage.",
    services: [
      "core-bitcoin",
      "core-postgres",
      "core-fulcrum",
      "explorer-btc-rpc",
      "anchor-dashboard",
    ],
  },
  {
    id: "default",
    name: "Default",
    description:
      "Recommended setup with core services, Anchor indexer, wallet, testnet, and Mempool explorer.",
    services: [
      "core-bitcoin",
      "core-postgres",
      "core-electrs",
      "core-indexer",
      "core-wallet",
      "core-testnet",
      "explorer-mempool",
      "anchor-dashboard",
    ],
  },
  {
    id: "full",
    name: "Full",
    description:
      "All services including apps, networking (Tor, Tailscale, Cloudflare), and monitoring.",
    services: [
      "core-bitcoin",
      "core-postgres",
      "core-electrs",
      "core-indexer",
      "core-wallet",
      "core-testnet",
      "explorer-mempool",
      "explorer-btc-rpc",
      "explorer-bitfeed",
      "networking-tailscale",
      "networking-cloudflare",
      "networking-tor",
      "monitoring-netdata",
      "anchor-dashboard",
      "app-threads",
      "app-canvas",
      "app-places",
      "app-domains",
      "app-proof",
      "app-tokens",
      "app-oracles",
      "app-predictions",
    ],
    warning:
      "This configuration requires significant resources (RAM, CPU, disk space). Recommended for powerful machines only.",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Choose which services to install manually.",
    services: [],
  },
];

// Category labels
export const categoryLabels: Record<ServiceCategory, string> = {
  core: "Core Services",
  explorer: "Block Explorers",
  networking: "Networking",
  monitoring: "Monitoring",
  app: "Applications",
  dashboard: "Dashboard",
};

// Category descriptions
export const categoryDescriptions: Record<ServiceCategory, string> = {
  core: "Essential infrastructure services for running Bitcoin and Anchor",
  explorer: "Block explorers for viewing blockchain data",
  networking: "VPN, tunneling, and privacy networking options",
  monitoring: "System and container monitoring tools",
  app: "Bitcoin-powered applications built on Anchor",
  dashboard: "Main control panel for Anchor OS",
};

// Check if selecting a service would cause incompatibility
export function checkIncompatibility(
  serviceId: string,
  selectedServices: string[]
): string | null {
  const incompatible = incompatibilities[serviceId] || [];
  for (const incompatibleService of incompatible) {
    if (selectedServices.includes(incompatibleService)) {
      return incompatibleService;
    }
  }
  return null;
}

// Get all dependencies for a service (recursive)
export function getAllDependencies(
  serviceId: string,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(serviceId)) return [];
  visited.add(serviceId);

  const directDeps = dependencies[serviceId] || [];
  const allDeps: string[] = [...directDeps];

  for (const dep of directDeps) {
    const transitiveDeps = getAllDependencies(dep, visited);
    for (const td of transitiveDeps) {
      if (!allDeps.includes(td)) {
        allDeps.push(td);
      }
    }
  }

  return allDeps;
}

// Get services that depend on a given service
export function getDependents(serviceId: string): string[] {
  const dependents: string[] = [];
  for (const [service, deps] of Object.entries(dependencies)) {
    if (deps.includes(serviceId)) {
      dependents.push(service);
    }
  }
  return dependents;
}

// Validate a service selection and return errors if any
export function validateSelection(selectedServices: string[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingDependencies: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingDependencies: string[] = [];

  // Check for required services
  for (const required of requiredServices) {
    if (!selectedServices.includes(required)) {
      missingDependencies.push(required);
    }
  }

  // Check for incompatibilities
  for (const service of selectedServices) {
    const incompatible = checkIncompatibility(service, selectedServices);
    if (incompatible) {
      errors.push(
        `Cannot select both "${service}" and "${incompatible}" - they use the same port`
      );
    }
  }

  // Check for missing dependencies
  for (const service of selectedServices) {
    const deps = dependencies[service] || [];
    for (const dep of deps) {
      if (!selectedServices.includes(dep) && !missingDependencies.includes(dep)) {
        missingDependencies.push(dep);
      }
    }
  }

  // Generate warnings for heavy services
  if (selectedServices.includes("monitoring-netdata")) {
    warnings.push("Netdata uses additional system resources for monitoring");
  }

  if (selectedServices.includes("networking-tor")) {
    warnings.push("Tor network may affect connection speeds");
  }

  const appCount = selectedServices.filter((s) => s.startsWith("app-")).length;
  if (appCount > 3) {
    warnings.push(`You have selected ${appCount} apps - this may require more resources`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingDependencies,
  };
}

// Get preset by id
export function getPresetById(presetId: InstallationPreset): PresetInfo | undefined {
  return presets.find((p) => p.id === presetId);
}

// Get recommended electrum server based on selection
export function getRecommendedElectrumServer(
  selectedServices: string[]
): "core-electrs" | "core-fulcrum" | null {
  if (selectedServices.includes("core-electrs")) return "core-electrs";
  if (selectedServices.includes("core-fulcrum")) return "core-fulcrum";

  // If mempool is selected, recommend electrs
  if (selectedServices.includes("explorer-mempool")) {
    return "core-electrs";
  }

  return null;
}
