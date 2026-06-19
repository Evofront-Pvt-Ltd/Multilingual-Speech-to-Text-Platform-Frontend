/** Merge live browser + neural preview text for the fullest capture. */
export function mergeLiveCaptures(...parts: Array<string | undefined>): string {
  const unique: string[] = [];

  for (const part of parts) {
    const cleaned = part?.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    if (unique.some((existing) => existing.includes(cleaned))) continue;
    if (unique.some((existing) => cleaned.includes(existing))) {
      const index = unique.findIndex((existing) => cleaned.includes(existing));
      if (index >= 0) unique[index] = cleaned;
      continue;
    }
    unique.push(cleaned);
  }

  return unique.join(' ').trim();
}
