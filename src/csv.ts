import type { Assignment } from "./algorithm";

function escapeCsv(value: string): string {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

export function buildCsv(assignments: Assignment[]): string {
  const lines = ["Seat,Name"];

  for (const assignment of assignments) {
    lines.push(`${escapeCsv(assignment.seat.label)},${escapeCsv(assignment.student.name)}`);
  }

  return lines.join("\r\n");
}

export function downloadCsv(assignments: Assignment[], fileName = "casino-royale-seat-shuffle.csv"): void {
  const csv = `\uFEFF${buildCsv(assignments)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

