/**
 * Multi-client setups for agencies (and anyone with more than one programme).
 * Local-only — no account. Each profile is a named audience + optional brand line for briefs.
 */

import {
  type Audience,
  EMPTY_AUDIENCE,
  STORAGE_KEY,
  audienceActive,
  audienceToSearch,
} from "@/lib/audience";

export type Profile = {
  id: string;
  /** Client or brand name shown on /brief */
  name: string;
  audience: Audience;
  updatedAt: string;
};

export const PROFILES_KEY = "emailrules.profiles.v1";
export const ACTIVE_PROFILE_KEY = "emailrules.activeProfile.v1";

export function newProfileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `p${Date.now().toString(36)}`;
}

export function emptyProfile(name = "My programme"): Profile {
  return {
    id: newProfileId(),
    name: name.trim() || "My programme",
    audience: { ...EMPTY_AUDIENCE },
    updatedAt: new Date().toISOString(),
  };
}

export function readProfiles(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Profile[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
      .map((p) => ({
        id: p.id,
        name: p.name.slice(0, 80),
        audience: { ...EMPTY_AUDIENCE, ...(p.audience ?? {}) },
        updatedAt: p.updatedAt || new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function writeProfiles(list: Profile[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(list.slice(0, 24)));
  } catch {
    /* quota */
  }
}

export function readActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
  } catch {
    /* */
  }
}

/** Migrate legacy single audience into a profile once. */
export function ensureProfilesFromLegacy(): Profile[] {
  let list = readProfiles();
  if (list.length > 0) return list;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return list;
    const audience = { ...EMPTY_AUDIENCE, ...(JSON.parse(raw) as Partial<Audience>) };
    if (!audienceActive(audience)) return list;
    const p = emptyProfile("My programme");
    p.audience = audience;
    list = [p];
    writeProfiles(list);
    setActiveProfileId(p.id);
  } catch {
    /* */
  }
  return list;
}

export function getActiveProfile(): Profile | null {
  const list = ensureProfilesFromLegacy();
  if (list.length === 0) return null;
  const id = readActiveProfileId();
  return list.find((p) => p.id === id) ?? list[0] ?? null;
}

export function upsertProfile(profile: Profile): Profile[] {
  const list = readProfiles();
  const i = list.findIndex((p) => p.id === profile.id);
  const next = { ...profile, updatedAt: new Date().toISOString() };
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeProfiles(list);
  setActiveProfileId(next.id);
  return list;
}

export function deleteProfile(id: string): Profile[] {
  const list = readProfiles().filter((p) => p.id !== id);
  writeProfiles(list);
  const active = readActiveProfileId();
  if (active === id) setActiveProfileId(list[0]?.id ?? null);
  return list;
}

export function briefPathForProfile(p: Profile): string {
  const qs = audienceToSearch(p.audience);
  const name = encodeURIComponent(p.name);
  const base = qs ? `${qs}&client=${name}` : `?client=${name}`;
  return `/brief${base}`;
}
