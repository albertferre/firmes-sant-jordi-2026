const EVENT_MONTH = 4; // April
const EVENT_DAY = 23;

/** Returns true if today is April 23 */
export function isEventDay(): boolean {
  const now = new Date();
  return now.getMonth() + 1 === EVENT_MONTH && now.getDate() === EVENT_DAY;
}

/** Returns true if a signing with the given start/end times is happening right now (only on event day) */
export function isSigningLive(startTime: string, endTime: string): boolean {
  if (!isEventDay() || !startTime || !endTime) return false;
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= sh * 60 + sm && minutes < eh * 60 + em;
}
