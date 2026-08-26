function extractNumericSearchTerm(term) {
  const trimmed = String(term || "").trim();
  if (!trimmed) return null;
  const numericPart = trimmed.startsWith("#") ? trimmed.slice(1).trim() : trimmed;
  return /^\d+$/.test(numericPart) ? numericPart : null;
}

function matchesDirectoryIdSearch(input, searchTerm, options = {}) {
  const trimmedSearch = String(searchTerm || "").trim();
  if (!trimmedSearch) return true;
  const mixedRequiresWhitespace = options.mixedRequiresWhitespace ?? false;
  const idText = input.idText;
  const blob = input.textBlob;
  const numericOnly = extractNumericSearchTerm(trimmedSearch);
  if (numericOnly !== null) return idText.includes(numericOnly);
  const lower = trimmedSearch.toLowerCase();
  const digits = trimmedSearch.replace(/\D/g, "");
  const letters = trimmedSearch.replace(/[\d#]/g, "").trim().toLowerCase();
  if (digits && letters && (!mixedRequiresWhitespace || /\s/.test(trimmedSearch))) {
    return idText.includes(digits) && blob.includes(letters);
  }
  return blob.includes(lower) || (digits.length > 0 && idText.includes(digits));
}

module.exports = { extractNumericSearchTerm, matchesDirectoryIdSearch };
