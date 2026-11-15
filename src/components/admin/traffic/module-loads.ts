'use client';

// Client-side record of which screening modules have data for which domain,
// so the outer table can light the module dots and fill the "Đối thủ quảng
// cáo" column WITHOUT any new API call: values are stashed here when the user
// actually loads a panel in the detail modal. Backlink/Ads results are only
// cached server-side per process, so this localStorage mirror is the only
// client-visible memory of a past load (per-browser by design).

import type { TrafficRow } from './traffic-helpers';

export type ScreenModule = 'traffic' | 'backlink' | 'ads' | 'affiliate';

export interface ModuleLoadRecord {
  /** Epoch ms of the last successful load. */
  loadedAt: number;
  /** For 'ads': external-active advertiser count from the cached response. */
  externalActive?: number;
}

const STORAGE_KEY = 'traffic_module_loads_v1';

function readStore(): Record<string, Partial<Record<ScreenModule, ModuleLoadRecord>>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<Record<ScreenModule, ModuleLoadRecord>>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, Partial<Record<ScreenModule, ModuleLoadRecord>>>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private-mode storage failure — module dots degrade to "chưa tải" only.
  }
}

export function getModuleLoads(domain: string): Partial<Record<ScreenModule, ModuleLoadRecord>> {
  return readStore()[domain] ?? {};
}

export function recordModuleLoad(domain: string, module: ScreenModule): void {
  const store = readStore();
  const entry = store[domain] ?? {};
  entry[module] = { loadedAt: Date.now() };
  store[domain] = entry;
  writeStore(store);
}

/** External-active advertiser count from the cached Ads response, or null. */
export function getAdsExternalActive(domain: string): number | null {
  const record = getModuleLoads(domain).ads;
  return typeof record?.externalActive === 'number' ? record.externalActive : null;
}

export function recordAdsInsight(domain: string, externalActive: number): void {
  const store = readStore();
  const entry = store[domain] ?? {};
  entry.ads = { loadedAt: Date.now(), externalActive };
  store[domain] = entry;
  writeStore(store);
}

/** Traffic dot is lit straight from the persisted report — no localStorage. */
export function isTrafficLoaded(row: TrafficRow): boolean {
  return row.report != null;
}
