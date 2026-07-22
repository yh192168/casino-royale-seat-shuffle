import { roster, type Student } from "./roster";

export type SeatDefinition = {
  label: string;
  row: number;
  col: number;
  x: number;
  y: number;
};

export type Assignment = {
  seat: SeatDefinition;
  student: Student;
};

export type Arrangement = {
  assignments: Assignment[];
  score: number;
  iterations: number;
};

export const specialFocusNames = [
  "小田島 律",
  "原 優",
  "坪山 瑛太",
  "アルバートソン ジェイコブ",
] as const;

const seatRows = [
  ["A1", "B1", "C1", "D1", "E1", "F1"],
  ["A2", "B2", "C2", "D2", "E2", "F2"],
  ["A3", "B3", "C3", "D3", "E3", "F3"],
  ["A4", "B4", "C4", "D4", "E4", "F4"],
  ["", "", "C5", "D5", "E5", ""],
] as const;

export const seatDefinitions: SeatDefinition[] = seatRows.flatMap((row, rowIndex) =>
  row
    .map((label, colIndex) => {
      if (!label) {
        return null;
      }

      return {
        label,
        row: rowIndex,
        col: colIndex,
        x: colIndex,
        y: rowIndex,
      } satisfies SeatDefinition;
    })
    .filter((seat): seat is SeatDefinition => seat !== null),
);

function shuffleInPlace<T>(items: T[], random = Math.random): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function distance(a: SeatDefinition, b: SeatDefinition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function scoreArrangement(candidate: Student[]): number {
  const seatsByStudentName = new Map<string, SeatDefinition>();

  for (let index = 0; index < candidate.length; index += 1) {
    seatsByStudentName.set(candidate[index].name, seatDefinitions[index]);
  }

  const odajima = seatsByStudentName.get("小田島 律");
  const hara = seatsByStudentName.get("原 優");
  const tsuboyama = seatsByStudentName.get("坪山 瑛太");
  const alber = seatsByStudentName.get("アルバートソン ジェイコブ");

  if (!odajima || !hara || !tsuboyama || !alber) {
    return -Infinity;
  }

  return distance(odajima, hara) * distance(odajima, tsuboyama) * distance(odajima, alber);
}

export function generateBestArrangement(
  students: Student[] = roster,
  iterations = 20000,
  random = Math.random,
): Arrangement {
  if (students.length !== seatDefinitions.length) {
    throw new Error(`Expected ${seatDefinitions.length} students, received ${students.length}.`);
  }

  let bestScore = -Infinity;
  let bestCandidate: Student[] = [];

  // Pin handling: force 長澤 潤 to seat C1 if present
  const pinnedName = "長澤 潤";
  const pinnedSeatLabel = "C1";
  const pinnedStudent = students.find((s) => s.name === pinnedName);
  const pinnedIndex = seatDefinitions.findIndex((s) => s.label === pinnedSeatLabel);

  if (pinnedStudent && pinnedIndex !== -1) {
    // When pinned, shuffle only the other students and insert the pinned student at the pinned index.
    const othersBase = students.filter((s) => s.name !== pinnedName);

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const others = shuffleInPlace([...othersBase], random);
      const candidate: Student[] = new Array(students.length);
      let otherIdx = 0;

      for (let i = 0; i < seatDefinitions.length; i += 1) {
        if (i === pinnedIndex) {
          candidate[i] = pinnedStudent;
        } else {
          candidate[i] = others[otherIdx++];
        }
      }

      const score = scoreArrangement(candidate);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }
  } else {
    // Fallback: original behaviour if pinned student or seat not found
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const candidate = shuffleInPlace([...students], random);
      const score = scoreArrangement(candidate);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }
  }

  return {
    assignments: seatDefinitions.map((seat, index) => ({
      seat,
      student: bestCandidate[index],
    })),
    score: bestScore,
    iterations,
  };
}

export function orderAssignmentsForShow(assignments: Assignment[], random = Math.random): Assignment[] {
  return shuffleInPlace([...assignments], random);
}

export function getSeatLabelToAssignment(assignments: Assignment[]): Map<string, Assignment> {
  return new Map(assignments.map((assignment) => [assignment.seat.label, assignment]));
}

export function getStudentByName(name: string): Student | undefined {
  return roster.find((student) => student.name === name);
}
