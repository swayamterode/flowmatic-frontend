/*
 * Reading a CSV well enough to describe it. The Datasource node uses this to
 * report what a dropped file contains — column names, how many rows — before
 * anything is sent anywhere.
 *
 * The scanner is quote-aware on purpose. `text.split("\n")` gets both jobs
 * wrong: it mis-splits a header like `id,"Last, First",email` into four columns,
 * and it over-counts rows in any file with a newline inside a quoted field.
 * Since one pass answers both questions, there is one pass.
 */

/** The whole file is read into memory to count rows, so the cap is real. */
export const CSV_MAX_BYTES = 10 * 1024 * 1024;

export const CSV_MAX_LABEL = "10 MB";

/*
 * Both an extension and the MIME type, because browsers disagree about CSV:
 * macOS with Excel installed reports .csv files as application/vnd.ms-excel,
 * and Windows as application/csv. The extension is what actually filters.
 */
export const CSV_ACCEPT = ".csv,text/csv";

export type CsvPreview = {
  /** Header row, in file order. */
  columns: string[];
  /** Data records, excluding the header. */
  rowCount: number;
};

/**
 * Checks a file before reading it. Returns a message to show the user, or null
 * when the file is acceptable.
 *
 * Deliberately extension-only: `file.type` is unreliable for CSV (see
 * CSV_ACCEPT), so trusting it would reject valid files on common setups.
 */
export function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Only .csv files are accepted.";
  }
  if (file.size > CSV_MAX_BYTES) {
    return `That file is larger than ${CSV_MAX_LABEL}.`;
  }
  return null;
}

/** Human-readable size for the file chip. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 10 ("1.4 MB"), none above ("20 KB") — enough to be useful
  // without implying precision the number doesn't have.
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/*
 * A record ends at a newline that isn't inside quotes. Within quotes, "" is an
 * escaped quote rather than the end of the field — consuming both characters is
 * what keeps the scanner from falling out of quoted state early.
 */
function scan(text: string): { header: string[]; rowCount: number } {
  const header: string[] = [];
  let field = "";
  let rowCount = 0;
  let inQuotes = false;
  let onHeader = true;
  // Distinguishes "between records" from "inside an empty first field", so a
  // trailing newline doesn't count as one more row.
  let recordStarted = false;

  const endField = () => {
    if (onHeader) header.push(field.trim());
    field = "";
  };

  const endRecord = () => {
    endField();
    if (onHeader) onHeader = false;
    else rowCount += 1;
    recordStarted = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char !== '"') {
        field += char;
        continue;
      }
      if (text[i + 1] === '"') {
        field += '"';
        i += 1;
        continue;
      }
      inQuotes = false;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      recordStarted = true;
      continue;
    }

    if (char === ",") {
      recordStarted = true;
      endField();
      continue;
    }

    // \r\n and a bare \r both end a record; \r never survives into a value.
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      if (recordStarted) endRecord();
      continue;
    }

    recordStarted = true;
    field += char;
  }

  // A file that doesn't end in a newline still has a final record open.
  if (recordStarted) endRecord();

  return { header, rowCount };
}

/**
 * Reads the header row and counts data records. Throws an `Error` whose message
 * is safe to show the user.
 */
export async function readCsvPreview(file: File): Promise<CsvPreview> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error("That file could not be read.");
  }

  // Excel writes a BOM; left in place it becomes part of the first column name.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  if (!text.trim()) throw new Error("That file is empty.");

  const { header, rowCount } = scan(text);

  // Reachable with a file of only delimiters — there is nothing to name.
  if (header.every((column) => !column)) {
    throw new Error("That file has no column headers.");
  }

  return { columns: header, rowCount };
}
