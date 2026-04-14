export type LiftDayPreset = {
  name: string;
  shortLabel: string;
  scheduleDay: number;
  goal: string;
  focus: string;
  exercises: string[];
};

export const LIFT_DAY_PRESETS: LiftDayPreset[] = [
  {
    name: "Lower A",
    shortLabel: "Sun",
    scheduleDay: 0,
    goal: "Quad anchor day",
    focus: "Quads, calves, and trunk",
    exercises: [
      "Pendulum Squat",
      "Hack Squat",
      "Leg Press",
      "Bulgarian Split Squat",
      "Leg Extension",
      "Lying Hamstring Curl",
      "Machine Calf Raise",
      "Ab Rollout",
      "Hanging Leg Raise",
    ],
  },
  {
    name: "Push A",
    shortLabel: "Mon",
    scheduleDay: 1,
    goal: "Upper chest + side delts",
    focus: "Fresh incline press and delt volume",
    exercises: [
      "Incline Dumbbell Bench Press",
      "Incline Barbell Bench Press",
      "Machine Chest Press",
      "Low-to-High Cable Fly",
      "Seated Dumbbell Overhead Press",
      "Cable Lateral Raise",
      "Dumbbell Lateral Raise",
      "Machine Overhead Triceps Extension",
    ],
  },
  {
    name: "Pull A",
    shortLabel: "Tue",
    scheduleDay: 2,
    goal: "Lat width + upper back",
    focus: "Heavy width work with low-fatigue rows",
    exercises: [
      "Pull-Up",
      "Lat Pulldown",
      "Chest-Supported Row",
      "Single-Arm Lat Pull",
      "Rear Delt Fly",
      "Incline Dumbbell Curl",
      "Hammer Curl",
    ],
  },
  {
    name: "Lower B",
    shortLabel: "Thu",
    scheduleDay: 4,
    goal: "Posterior chain + calves",
    focus: "Hip hinge, single-leg work, and trunk",
    exercises: [
      "Romanian Deadlift",
      "Bulgarian Split Squat",
      "Lying Hamstring Curl",
      "Hamstring Curl",
      "Hack Squat",
      "Leg Extension",
      "Seated Calf Raise",
      "Hanging Leg Raise",
      "Pallof Press",
    ],
  },
  {
    name: "Upper B",
    shortLabel: "Sat",
    scheduleDay: 6,
    goal: "Upper chest + back + delts",
    focus: "Second upper specialization day",
    exercises: [
      "Incline Barbell Bench Press",
      "Bench Press",
      "Dip",
      "T-Bar Row (Machine)",
      "T-Bar Row (Free)",
      "Lat Pulldown",
      "Pull-Up",
      "Cable Lateral Raise",
      "Rear Delt Fly",
      "Face Pull",
      "Barbell Curl",
      "Rope Triceps Pushdown",
    ],
  },
] as const;

export const LIFT_EXERCISE_PRESETS: Record<string, string[]> = Object.fromEntries(
  LIFT_DAY_PRESETS.map((preset) => [preset.name, preset.exercises])
);
