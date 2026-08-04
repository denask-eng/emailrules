import "server-only";

import { sql, hasDatabase } from "@/lib/db";
import type { EspProductId } from "@/lib/types";

/**
 * The ESP truth table — what a platform actually does, measured.
 *
 * This site's best idea is `ownership`: most of what sounds like your job is
 * your platform's job. Today that judgement is editorial. It is well reasoned
 * and sourced against vendor documentation, and vendor documentation lags,
 * omits, and occasionally is simply wrong — which is the entire reason the
 * idea needed a site in the first place.
 *
 * So the next version of that claim is not a better-argued paragraph. It is a
 * measurement: send one real campaign through each platform, read the headers
 * that actually arrived, publish it with a date.
 *
 * ── Why this table starts empty ───────────────────────────────────────────
 *
 * It would take an afternoon to seed it from seven help centres, and the
 * result would look identical to the real thing while being precisely the
 * artefact this table exists to replace. A measured table with three rows
 * beats a documented table with seventy, because only one of them can settle
 * an argument.
 *
 * Nothing is written here except by `recordMeasurement`, and nothing calls
 * that except a real send.
 */

export interface EspMeasurement {
  id: string;
  esp: EspProductId;
  measuredOn: string;
  listUnsub: boolean | null;
  listUnsubPost: boolean | null;
  unsubHttps: boolean | null;
  dkimD: string | null;
  dkimAligned: boolean | null;
  returnPath: string | null;
  trackingPixel: boolean | null;
  postalAddress: boolean | null;
  method: string;
  note: string | null;
}

/** What the table asks of every platform. Published so a reader can repeat it. */
export const MEASURED_FIELDS: { key: keyof EspMeasurement; label: string; why: string }[] = [
  {
    key: "listUnsub",
    label: "List-Unsubscribe",
    why: "Required for bulk mail. Present on the message as it actually left the platform, not as the help centre describes it.",
  },
  {
    key: "listUnsubPost",
    label: "List-Unsubscribe-Post",
    why: "The half everybody forgets. Without it there is no RFC 8058 one-click unsubscribe, whatever the other header says.",
  },
  {
    key: "unsubHttps",
    label: "HTTPS unsubscribe URI",
    why: "A mailto: on its own does not satisfy one-click. Measured from the URI that arrived.",
  },
  {
    key: "dkimAligned",
    label: "DKIM aligns with From",
    why: "A signature that passes but does not align does nothing for DMARC. Only a real message can show this.",
  },
  {
    key: "trackingPixel",
    label: "Open pixel by default",
    why: "Whether the platform inserts one without being asked, which is the fact the French and Italian consent rules turn on.",
  },
  {
    key: "postalAddress",
    label: "Postal address in the footer",
    why: "Whether the platform's default template carries one, or leaves CAN-SPAM entirely to you.",
  },
];

export async function listMeasurements(): Promise<EspMeasurement[]> {
  if (!hasDatabase()) return [];
  const rows = (await sql().query(
    `select id, esp, measured_on::text as measured_on, list_unsub, list_unsub_post,
            unsub_https, dkim_d, dkim_aligned, return_path, tracking_pixel,
            postal_address, method, note
     from esp_measurements
     order by esp, measured_on desc`,
  )) as unknown as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    esp: r.esp as EspProductId,
    measuredOn: r.measured_on as string,
    listUnsub: r.list_unsub as boolean | null,
    listUnsubPost: r.list_unsub_post as boolean | null,
    unsubHttps: r.unsub_https as boolean | null,
    dkimD: r.dkim_d as string | null,
    dkimAligned: r.dkim_aligned as boolean | null,
    returnPath: r.return_path as string | null,
    trackingPixel: r.tracking_pixel as boolean | null,
    postalAddress: r.postal_address as boolean | null,
    method: r.method as string,
    note: r.note as string | null,
  }));
}

/** The newest measurement per platform — what the table renders. */
export async function latestPerEsp(): Promise<EspMeasurement[]> {
  const all = await listMeasurements();
  const seen = new Set<string>();
  const out: EspMeasurement[] = [];
  for (const m of all) {
    if (seen.has(m.esp)) continue;
    seen.add(m.esp);
    out.push(m);
  }
  return out;
}

/**
 * Record one measurement.
 *
 * `method` is required and is printed on the page. A measurement whose
 * provenance is not stated is an assertion, and this table has exactly one
 * job, which is to not be that.
 */
export async function recordMeasurement(
  m: Omit<EspMeasurement, "id"> & { id?: string },
): Promise<void> {
  if (!hasDatabase()) throw new Error("no database");
  if (!m.method?.trim()) throw new Error("a measurement must state how it was obtained");

  const id = m.id ?? `${m.esp}-${m.measuredOn}`;
  await sql().query(
    `insert into esp_measurements
       (id, esp, measured_on, list_unsub, list_unsub_post, unsub_https, dkim_d,
        dkim_aligned, return_path, tracking_pixel, postal_address, method, note)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     on conflict (id) do update set
       list_unsub = excluded.list_unsub, list_unsub_post = excluded.list_unsub_post,
       unsub_https = excluded.unsub_https, dkim_d = excluded.dkim_d,
       dkim_aligned = excluded.dkim_aligned, return_path = excluded.return_path,
       tracking_pixel = excluded.tracking_pixel, postal_address = excluded.postal_address,
       method = excluded.method, note = excluded.note, recorded_at = now()`,
    [
      id, m.esp, m.measuredOn, m.listUnsub, m.listUnsubPost, m.unsubHttps, m.dkimD,
      m.dkimAligned, m.returnPath, m.trackingPixel, m.postalAddress, m.method, m.note,
    ],
  );
}
