export type DirectoryIdSearchOptions = {
  mixedRequiresWhitespace?: boolean;
};

export type DirectoryIdSearchInput = {
  idText: string;
  textBlob: string;
};

export function extractNumericSearchTerm(term: string): string | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  const numericPart = trimmed.startsWith("#") ? trimmed.slice(1).trim() : trimmed;
  return /^\d+$/.test(numericPart) ? numericPart : null;
}

export function matchesDirectoryIdSearch(
  input: DirectoryIdSearchInput,
  searchTerm: string,
  options: DirectoryIdSearchOptions = {},
): boolean {
  const trimmedSearch = searchTerm.trim();
  if (!trimmedSearch) return true;

  const mixedRequiresWhitespace = options.mixedRequiresWhitespace ?? false;
  const { idText, textBlob: blob } = input;
  const numericOnly = extractNumericSearchTerm(trimmedSearch);

  if (numericOnly !== null) {
    return idText.includes(numericOnly);
  }

  const lower = trimmedSearch.toLowerCase();
  const digits = trimmedSearch.replace(/\D/g, "");
  const letters = trimmedSearch.replace(/[\d#]/g, "").trim().toLowerCase();

  if (digits && letters && (!mixedRequiresWhitespace || /\s/.test(trimmedSearch))) {
    return idText.includes(digits) && blob.includes(letters);
  }

  return blob.includes(lower) || (digits.length > 0 && idText.includes(digits));
}

export type DirectorySearchHighlight = {
  idTerms: string[];
  textTerms: string[];
};

export function getDirectorySearchHighlight(
  searchTerm: string,
  options: DirectoryIdSearchOptions = {},
): DirectorySearchHighlight | null {
  const trimmed = searchTerm.trim();
  if (!trimmed) return null;

  const mixedRequiresWhitespace = options.mixedRequiresWhitespace ?? false;
  const numericOnly = extractNumericSearchTerm(trimmed);
  if (numericOnly !== null) {
    return { idTerms: [numericOnly], textTerms: [] };
  }

  const digits = trimmed.replace(/\D/g, "");
  const letters = trimmed.replace(/[\d#]/g, "").trim().toLowerCase();
  const lower = trimmed.toLowerCase();

  if (digits && letters && (!mixedRequiresWhitespace || /\s/.test(trimmed))) {
    // Spaced mixed ("00 alpha") → id digits + letter words.
    // Contiguous mixed (emails, SKUs: bland…961998@gmail.com) → keep full query so mark is contiguous.
    if (/\s/.test(trimmed)) {
      return { idTerms: [digits], textTerms: [letters] };
    }
    return { idTerms: [digits], textTerms: [lower] };
  }

  return {
    idTerms: digits.length > 0 ? [digits] : [],
    textTerms: lower ? [lower] : [],
  };
}

/** Flat terms for `HubDirectorySearchHighlightText` — bind to live `queryInput`, not debounced `query`. */
export function directorySearchHighlightTerms(
  searchTerm: string,
  options: DirectoryIdSearchOptions = {},
): readonly string[] {
  const highlight = getDirectorySearchHighlight(searchTerm, options);
  if (!highlight) return [];
  return [...highlight.idTerms, ...highlight.textTerms];
}

export type HighlightSegment = { text: string; highlight: boolean };

export function buildHighlightSegments(text: string, terms: string[]): HighlightSegment[] {
  if (!text || terms.length === 0) return [{ text, highlight: false }];

  const ranges: { start: number; end: number }[] = [];
  const lower = text.toLowerCase();

  for (const term of terms) {
    const needle = term.trim();
    if (!needle) continue;
    const tLower = needle.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(tLower, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + tLower.length });
      from = idx + 1;
    }
  }

  if (ranges.length === 0) return [{ text, highlight: false }];

  ranges.sort((a, b) => a.start - b.start);
  const merged = [ranges[0]!];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1]!;
    const cur = ranges[i]!;
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else merged.push(cur);
  }

  const segments: HighlightSegment[] = [];
  let pos = 0;
  for (const range of merged) {
    if (pos < range.start) segments.push({ text: text.slice(pos, range.start), highlight: false });
    segments.push({ text: text.slice(range.start, range.end), highlight: true });
    pos = range.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), highlight: false });
  return segments;
}
