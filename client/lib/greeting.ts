/**
 * Time-of-day greeting. Replaces the static "Welcome back,".
 * Buckets follow common wakefulness windows; tweak the cutoffs to taste.
 *
 *   00:00–04:59  Burning the midnight oil   (midnight)
 *   05:00–11:59  Good morning
 *   12:00–16:59  Good afternoon
 *   17:00–20:59  Good evening
 *   21:00–23:59  Good night
 */
export function getGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

/** Full line with the name appended, e.g. "Good morning, Saurabh". */
export function greetingWithName(name: string, date: Date = new Date()): string {
  return `${getGreeting(date)}, ${name}`;
}
