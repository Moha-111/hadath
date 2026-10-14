export const addMinutes = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

export const minutesBetween = (a: string, b: string): number =>
  (new Date(b).getTime() - new Date(a).getTime()) / 60_000;

export const daysBetween = (a: string, b: string): number => minutesBetween(a, b) / (60 * 24);

/** Simulated clock is shown in UTC so replays are identical everywhere. */
export const fmtTime = (iso: string): string => new Date(iso).toISOString().slice(11, 16);
export const fmtDate = (iso: string): string => new Date(iso).toISOString().slice(0, 10);
export const fmtDateTime = (iso: string): string => `${fmtDate(iso)} ${fmtTime(iso)}`;
