// Merge speech-recognition results into one transcript.
// Desktop Chrome gives each result only its new words; Android Chrome repeats everything said
// so far in every result. A result that starts with the text so far replaces it instead of adding to it.
export function joinTranscripts(parts: string[]): string {
  let text = "";
  for (const raw of parts) {
    const t = raw.trim();
    if (!t) continue;
    text = t.toLowerCase().startsWith(text.toLowerCase()) ? t : `${text} ${t}`;
  }
  return text;
}
