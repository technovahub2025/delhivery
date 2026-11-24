// Protect spreadsheet consumers from formula injection while preserving numbers.
export function csvCellValue(value) {
  if (typeof value !== 'string') return value == null ? '' : value;
  const trimmed = value.replace(/^[\s\u0000-\u001f]+/, '');
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed);
  if (!numeric && /^[=+\-@]/.test(trimmed)) return `'${value}`;
  return value;
}

export function csvEscape(value) {
  const safe = csvCellValue(value);
  const text = safe == null ? '' : String(safe);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(columns, rows) {
  return [columns, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
}
