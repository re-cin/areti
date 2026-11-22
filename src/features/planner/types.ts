export type Subject = { id: string; name: string; difficulty: number; urgency: number };

export type PlannerInput = {
  today: Date;
  exam?: { subjectId: string; date: Date };
  subjects: Subject[];
  window: { startMinute: number; endMinute: number }; // minutes from midnight
  studyDays: number[]; // 0 = Sunday ... 6 = Saturday
  dailyGoalMin: number;
  existing: PlannedBlock[]; // sessions already assigned (other subjects, locked days)
  excludedDates: string[]; // 'YYYY-MM-DD'
};

export type PlannedBlock = { date: string; subjectId: string; blocks: number; locked?: boolean };

export type PlannerResult = {
  sessions: PlannedBlock[];
  shortfallBlocks: number; // blocks that did not fit before the exam (UI should warn, never overload days)
};
