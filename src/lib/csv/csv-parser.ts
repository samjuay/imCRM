/**
 * Shared CSV utility — no external dependencies.
 * Handles: UTF-8 BOM, CRLF/LF, quoted fields, embedded commas/quotes in fields.
 */

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse CSV text into a 2-D array of strings.
 * First row is treated as headers by callers; this function returns all rows.
 */
export function parseCSV(text: string): string[][] {
  // Strip UTF-8 BOM (Excel on Windows adds this)
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped double-quote inside quoted field
        field += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    // Not in quotes
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      row.push(field.trim());
      field = "";
      i++;
      continue;
    }

    if (ch === '\r' && next === '\n') {
      row.push(field.trim());
      field = "";
      if (row.length > 0) rows.push(row);
      row = [];
      i += 2;
      continue;
    }

    if (ch === '\n' || ch === '\r') {
      row.push(field.trim());
      field = "";
      if (row.length > 0) rows.push(row);
      row = [];
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Last field / row
  if (field.trim() !== "" || row.length > 0) {
    row.push(field.trim());
    if (row.some((f) => f !== "")) rows.push(row);
  }

  return rows;
}

/**
 * Convert a 2-D array (headers + data rows) into a CSV string.
 * All fields are quoted; internal double-quotes are escaped as "".
 */
export function serializeCSV(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download of a CSV string.
 * Prepends UTF-8 BOM so Excel on Windows opens it correctly.
 */
export function downloadCSV(filename: string, csvString: string): void {
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Header → object mapper
// ---------------------------------------------------------------------------

/**
 * Given a header row and data rows, returns an array of objects keyed by header.
 * Empty trailing rows are filtered out.
 */
export function csvRowsToObjects(
  rows: string[][],
): Array<Record<string, string>> {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  if (!headers) return [];
  return data
    .filter((row) => row.some((f) => f !== ""))
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h.trim().toLowerCase().replace(/\s+/g, "_")] = row[idx]?.trim() ?? "";
      });
      return obj;
    });
}

// ---------------------------------------------------------------------------
// Phone normalisation (strip spaces / dashes / parens for comparison)
// ---------------------------------------------------------------------------
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}
