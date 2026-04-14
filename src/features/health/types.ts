export type SnapshotKey = "sleep" | "weight" | "steps" | "energy" | "soreness";

export type SnapshotItem = {
  key: SnapshotKey;
  label: string;
  value: string;
  change: string;
  changeDirection: "up" | "down";
};

export type LiftSession = {
  startedAt: string;
  workoutType: string;
};

export type LiftSetDraft = {
  reps: number;
  dropset: boolean;
  negativeReps: number;
  assistedReps: number;
};

export type LiftExerciseDraft = {
  exerciseQuery: string;
  selectedExercise: string | null;
  isEditingExercise: boolean;
  customExercise: string;
  isAddingExercise: boolean;
  sets: LiftSetDraft[];
  activeSetIndex: number;
};

export type LiftCompletedExercise = {
  exerciseName: string;
  setCount: number;
  sets: LiftSetDraft[];
};
