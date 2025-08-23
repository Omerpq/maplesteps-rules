// src/services/fsw67.ts
// Remote-first FSW-67 params with local fallback + simple cache.

import { RULES_CONFIG } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
// ---- Debug toggles (web-safe) ----------------------------------------------
const __WEB__ = typeof window !== 'undefined';
let __LS__: Storage | null = null;
try { __LS__ = typeof localStorage !== 'undefined' ? localStorage : null; } catch { __LS__ = null; }
const __DBG__ = __LS__?.getItem('ms_debug_rules') === '1';
const __FORCE_OFFLINE__ = __LS__?.getItem('ms_force_offline') === '1';
const __onLine = () => {
  try { return typeof navigator !== 'undefined' && 'onLine' in navigator ? (navigator as any).onLine : null; } catch { return null; }
};
const FSW_LOG = (...a: any[]) => { if (__DBG__) console.debug('[MS:FSW]', ...a); };


function isWebOffline(): boolean {
  try {
    // @ts-ignore
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}


// ---------- Types ----------
type EducationKey =
  | "phd"
  | "masters"
  | "two_or_more"
  | "bachelor"
  | "one_year_postsecondary"
  | "secondary";

type Input = {
  age: number;
  clb: number;                 // primary language CLB
  education: EducationKey;
  experienceYears: number;     // skilled years (demo)
  arrangedEmployment: boolean;
  adaptability: {
    spouse_language_clb4?: boolean;
    relative_in_canada?: boolean;
    canadian_study?: boolean;
    arranged_employment?: boolean; // +5 adaptability
    canadian_work_1yr?: boolean;
  };
};

// ---------- Local fallback (bundled) ----------
const localParams: any = require("../data/fsw67.params.json");

// ---------- Cache ----------
let cache: any | null = null;
let lastSyncedISO: string | null = null;
const K_FSW = "ms_fsw_params_cache_v1";
let fswSource: "remote" | "cache" | "local" = "local";
let fswCachedAtMs: number | null = null; // if not already present, add this



// Drop-in replacement for both files
// -- keep function signature as-is --
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const u = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
    const isWeb = typeof window !== "undefined";

    const finalInit: RequestInit = {
      ...(init || {}),
      cache: "no-store",
      signal: ctrl.signal,
    };

    if (isWeb) {
      // No custom headers on web → avoid CORS preflight
      if (finalInit.headers) delete (finalInit as any).headers;
    } else {
      finalInit.headers = {
        ...((init?.headers as any) || {}),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      };
    }

    return await fetch(u, finalInit);
  } finally {
    clearTimeout(timer);
  }
}



// Try remote first; fall back to local.
export async function primeFswParams(): Promise<any> {
  const __t0 = Date.now();
  let __branch: "remote" | "cache" | "local" | "unknown" = "unknown";
  const baseUrl = (RULES_CONFIG.fswParamsUrl || "").trim();
  const offline = !!__FORCE_OFFLINE__ || isWebOffline();
  const onLine = __onLine();
  const fetchUrl = !!baseUrl && !offline ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}t=${Date.now()}` : "";
  FSW_LOG && FSW_LOG("prime() start", { baseUrl: !!baseUrl, offline, onLine });

  // 1) REMOTE
  // In primeFswParams() — replace the REMOTE block
if (fetchUrl) {
  try {
    FSW_LOG && FSW_LOG("REMOTE try", { url: fetchUrl });
    const res = await fetchWithTimeout(fetchUrl, undefined, 12000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = await res.json();            // <— parse JSON

    cache = remote;                              // now real params JSON
    lastSyncedISO = new Date().toISOString();
    fswCachedAtMs = Date.now();
    fswSource = "remote";
    try { await AsyncStorage.setItem(K_FSW, JSON.stringify({ json: remote, ts: fswCachedAtMs })); } catch {}
    FSW_LOG && FSW_LOG("REMOTE success", { tookMs: Date.now() - __t0, savedAt: fswCachedAtMs });
    return cache;
  } catch (e) {
    FSW_LOG && FSW_LOG("REMOTE fail -> will try CACHE", { error: String(e) });
  }
}


  // 2) CACHE
  try {
    const raw = await AsyncStorage.getItem(K_FSW);
    if (raw) {
      const { json, ts } = JSON.parse(raw);
      if (json) {
        cache = json;
        lastSyncedISO = "cache" as any;
        fswCachedAtMs = typeof ts === "number" ? ts : null;
        fswSource = "cache";
        __branch = "cache";
        FSW_LOG && FSW_LOG("CACHE hit", { savedAt: fswCachedAtMs });
        return cache;
      }
    }
  } catch (e) {
    FSW_LOG && FSW_LOG("CACHE read failed", { error: String(e) });
  }

  // 3) LOCAL
  cache = localParams;
  lastSyncedISO = null;
  fswCachedAtMs = null;
  fswSource = "local";
  __branch = "local";
  FSW_LOG && FSW_LOG("LOCAL used", { tookMs: Date.now() - __t0 });
  return cache;
}






function getParamsSync(): any {
  const c = cache;
  // if cache isn’t a params object, fall back to local
  if (c && typeof c === "object" && (("education_points" in c) || ("age_points" in c))) return c;
  return localParams;
}


export function getFswVersion(): string {
  const p = getParamsSync();
  return p?.version ?? "unknown";
}

export function getFswLastSynced(): string {
  return lastSyncedISO ?? "local";
}

// ---------- Scoring helpers ----------
function fromRanges(
  ranges: Array<{ min: number; max: number; points: number }>,
  value: number
): number {
  const row = ranges.find((r) => value >= r.min && value <= r.max);
  return row ? row.points : 0;
}

function languagePerAbility(clb: number): number {
  const table: Record<string, number> =
    getParamsSync().language_primary_per_ability || {};
  const thresholds = Object.keys(table)
    .map(Number)
    .sort((a, b) => b - a);
  for (const thr of thresholds) {
    if (clb >= thr) return table[String(thr)];
  }
  return 0;
}

// ---------- Main calculator (sync; uses cached or local) ----------
export function calculateFsw67(input: Input) {
  const p = getParamsSync();
  const breakdown: Record<string, number> = {};

  // EDUCATION
  const eduTable: Record<string, number> = p.education_points || {};
  breakdown.education = Number(eduTable[input.education] ?? 0);

  // LANGUAGE (primary) — per-ability * 4
  breakdown.language = languagePerAbility(input.clb) * 4;

  // EXPERIENCE
  breakdown.experience = fromRanges(p.experience_years || [], input.experienceYears);

  // AGE
  breakdown.age = fromRanges(p.age_points || [], input.age);

  // ARRANGED EMPLOYMENT
  const ae = p.arranged_employment_points || { yes: 0, no: 0 };
  breakdown.arranged_employment = input.arrangedEmployment ? Number(ae.yes || 0) : Number(ae.no || 0);

  // ADAPTABILITY (cap at 10)
  const adTable: Record<string, number> = p.adaptability_points || {};
  let ad = 0;
  if (input.adaptability.spouse_language_clb4) ad += adTable.spouse_language_clb4 || 0;
  if (input.adaptability.relative_in_canada) ad += adTable.relative_in_canada || 0;
  if (input.adaptability.canadian_study) ad += adTable.canadian_study || 0;
  if (input.adaptability.arranged_employment) ad += adTable.arranged_employment || 0;
  if (input.adaptability.canadian_work_1yr) ad += adTable.canadian_work_1yr || 0;
  breakdown.adaptability = Math.min(ad, 10);

  const total =
    breakdown.education +
    breakdown.language +
    breakdown.experience +
    breakdown.age +
    breakdown.arranged_employment +
    breakdown.adaptability;

  const passMark = Number(p.pass_mark || 67);
  const pass = total >= passMark;

  let classification: "Likely" | "Borderline" | "Unlikely" = "Unlikely";
  if (pass) classification = "Likely";
  else if (total >= passMark - 5) classification = "Borderline";

  return {
    version: getFswVersion(),
    total,
    pass,
    passMark,
    classification,
    breakdown,
  };
}
export function getFswSource(): "remote" | "cache" | "local" {
  return fswSource;
}


export function getFswCachedAt(): number | null {
  return fswCachedAtMs ?? null;
}