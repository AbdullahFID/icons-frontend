// csvExport.ts — builds a CSV in memory and triggers a browser download.
// We don't use an external library (like PapaParse) because our needs are
// basic: join headers + rows, quote cells that contain commas/quotes/newlines,
// stuff it into a Blob, and click a synthetic <a download> link.

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: string[][]
) {
  // RFC 4180 escaping: wrap a value in double quotes if it contains a
  // comma, quote, or newline — and double up any existing quotes inside.
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
