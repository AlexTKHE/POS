import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  fetchHealthDailyLog,
  fetchRecentHealthDailyLogs,
  type HealthDailyLogRow,
  upsertHealthDailyLog,
} from "../data/health";
import { HealthDietTab } from "../components/HealthDietTab";
import { HealthLiftTab } from "../components/HealthLiftTab";
import { HealthOverviewTab } from "../components/HealthOverviewTab";
import {
  LIFT_DAY_PRESETS,
  LIFT_EXERCISE_PRESETS,
  type LiftDayPreset,
} from "../data/liftPresets";
import type {
  LiftCompletedExercise,
  LiftExerciseDraft,
  LiftSetDraft,
  LiftSession,
  SnapshotItem,
  SnapshotKey,
} from "../types";

const HUBS = ["Health", "Mind", "Finance", "Relationships", "Learning", "Productivity"];
const HEALTH_SECTIONS = ["Overview", "Lift", "Diet"] as const;
const SNAPSHOT_DEFS = [
  { key: "sleep", label: "Average sleep", unit: "hours" },
  { key: "weight", label: "Average morning weight", unit: "weight" },
  { key: "steps", label: "Average steps", unit: "steps" },
  { key: "energy", label: "Average morning energy", unit: "score" },
  { key: "soreness", label: "Average soreness", unit: "score" },
] as const;

type HealthSection = (typeof HEALTH_SECTIONS)[number];
type DetailMode = "history" | "edit";
type DetailTimeframe = "daily" | "weekly" | "monthly";
type WeightViewMode = "weekly" | "monthly" | "yearly";
type LiftDaySelectorItem = LiftDayPreset;

type DailyLogDraft = {
  sleepHours: string;
  morningWeight: string;
  stepsYesterday: string;
  soreness: number;
  energy: number;
};

type HistoryPeriodItem = {
  key: string;
  label: string;
  value: number;
  change: string | null;
  changeDirection: "up" | "down" | null;
  logDate?: string;
};

type ChartPoint = {
  x: number;
  y: number;
  label: string;
  value: number;
};

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getScheduledLiftDayIndex(date = new Date()) {
  const weekday = date.getDay();
  const exactMatchIndex = LIFT_DAY_PRESETS.findIndex((preset) => preset.scheduleDay === weekday);
  if (exactMatchIndex >= 0) {
    return exactMatchIndex;
  }

  const nextMatchIndex = LIFT_DAY_PRESETS.findIndex((preset) => preset.scheduleDay > weekday);
  if (nextMatchIndex >= 0) {
    return nextMatchIndex;
  }

  return 0;
}

const EMPTY_DAILY_LOG: DailyLogDraft = {
  sleepHours: "",
  morningWeight: "",
  stepsYesterday: "",
  soreness: 5,
  energy: 5,
};

const EMPTY_LIFT_SET_DRAFT: LiftSetDraft = {
  reps: 5,
  dropset: false,
  negativeReps: 0,
  assistedReps: 0,
};

const EMPTY_LIFT_EXERCISE_DRAFT: LiftExerciseDraft = {
  exerciseQuery: "",
  selectedExercise: null,
  isEditingExercise: false,
  customExercise: "",
  isAddingExercise: false,
  sets: [{ ...EMPTY_LIFT_SET_DRAFT }],
  activeSetIndex: 0,
};

function formatHours(value: number) {
  const wholeHours = Math.floor(value);
  const minutes = Math.round((value - wholeHours) * 60);
  return `${wholeHours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatAverage(unit: (typeof SNAPSHOT_DEFS)[number]["unit"], value: number) {
  if (unit === "hours") {
    return formatHours(value);
  }

  if (unit === "weight") {
    return `${value.toFixed(1)} lb`;
  }

  if (unit === "steps") {
    return `${Math.round(value).toLocaleString()}`;
  }

  return `${value.toFixed(1)} / 10`;
}

function formatChange(
  unit: (typeof SNAPSHOT_DEFS)[number]["unit"],
  currentAverage: number,
  previousAverage: number
) {
  const rawChange = currentAverage - previousAverage;
  const direction: "up" | "down" = rawChange >= 0 ? "up" : "down";
  const absoluteChange = Math.abs(rawChange);

  if (unit === "hours") {
    const minutes = Math.round(absoluteChange * 60);
    return {
      change: `${minutes}m`,
      direction,
    };
  }

  if (unit === "weight") {
    return {
      change: `${absoluteChange.toFixed(1)} lb`,
      direction,
    };
  }

  if (unit === "steps") {
    return {
      change: `${Math.round(absoluteChange).toLocaleString()}`,
      direction,
    };
  }

  return {
    change: `${absoluteChange.toFixed(1)}`,
    direction,
  };
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getSnapshotItems(logs: HealthDailyLogRow[]): SnapshotItem[] {
  const sortedLogs = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const recent = sortedLogs.slice(0, 7);
  const previous = sortedLogs.slice(7, 14);

  return SNAPSHOT_DEFS.map((snapshot) => {
    const recentValues = recent.map((log) => {
      if (snapshot.key === "sleep") return log.sleep_hours;
      if (snapshot.key === "weight") return log.morning_weight_lb;
      if (snapshot.key === "steps") return log.steps_yesterday;
      if (snapshot.key === "energy") return log.energy;
      return log.soreness;
    });

    const previousValues = previous.map((log) => {
      if (snapshot.key === "sleep") return log.sleep_hours;
      if (snapshot.key === "weight") return log.morning_weight_lb;
      if (snapshot.key === "steps") return log.steps_yesterday;
      if (snapshot.key === "energy") return log.energy;
      return log.soreness;
    });

    const recentAverage = average(recentValues);
    const previousAverage = previousValues.length ? average(previousValues) : recentAverage;
    const { change, direction } = formatChange(snapshot.unit, recentAverage, previousAverage);

    return {
      key: snapshot.key,
      label: snapshot.label,
      value: recent.length ? formatAverage(snapshot.unit, recentAverage) : "--",
      change,
      changeDirection: direction,
    };
  });
}

function toDraft(log: HealthDailyLogRow): DailyLogDraft {
  return {
    sleepHours: `${log.sleep_hours}`,
    morningWeight: `${log.morning_weight_lb}`,
    stepsYesterday: `${log.steps_yesterday}`,
    soreness: log.soreness,
    energy: log.energy,
  };
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getMetricValueFromLog(log: HealthDailyLogRow, key: SnapshotKey) {
  if (key === "sleep") return log.sleep_hours;
  if (key === "weight") return log.morning_weight_lb;
  if (key === "steps") return log.steps_yesterday;
  if (key === "energy") return log.energy;
  return log.soreness;
}

function formatMetricLogValue(key: SnapshotKey, value: number) {
  const snapshot = SNAPSHOT_DEFS.find((item) => item.key === key);
  if (!snapshot) {
    return `${value}`;
  }

  return formatAverage(snapshot.unit, value);
}

function getRecentDateKeys(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
  });
}

function formatShortDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return "th";
  }

  const remainder = day % 10;
  if (remainder === 1) return "st";
  if (remainder === 2) return "nd";
  if (remainder === 3) return "rd";
  return "th";
}

function formatLongDate(dateKey: string) {
  if (!isValidDateKey(dateKey)) {
    return dateKey;
  }

  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const month = date.toLocaleDateString(undefined, { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${weekday} ${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

function formatHistoryDailyLabel(dateKey: string) {
  if (!isValidDateKey(dateKey)) {
    return dateKey;
  }

  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const day = date.getDate();

  return `${weekday} ${month} ${day}${getOrdinalSuffix(day)}`;
}

function startOfWeek(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() - day);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const dayOfMonth = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${dayOfMonth}`;
}

function formatWeekLabel(weekStartKey: string) {
  const start = new Date(`${weekStartKey}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: start.getMonth() === end.getMonth() ? undefined : "short",
    day: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
}

function getMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatShortMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
  });
}

function getYearMonthItems(logs: HealthDailyLogRow[], key: SnapshotKey): HistoryPeriodItem[] {
  const sortedLogs = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const snapshot = SNAPSHOT_DEFS.find((item) => item.key === key);
  const grouped = new Map<string, number[]>();

  sortedLogs.forEach((log) => {
    const monthKey = getMonthKey(log.log_date);
    const values = grouped.get(monthKey) ?? [];
    values.push(getMetricValueFromLog(log, key));
    grouped.set(monthKey, values);
  });

  return [...grouped.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([groupKey, values], index, items) => {
      const value = average(values);
      const previousValue = index < items.length - 1 ? average(items[index + 1][1]) : value;
      const changeInfo = snapshot
        ? formatChange(snapshot.unit, value, previousValue)
        : { change: "", direction: "up" as const };

      return {
        key: groupKey,
        label: formatMonthLabel(groupKey),
        value,
        change: index < items.length - 1 ? changeInfo.change : null,
        changeDirection: index < items.length - 1 ? changeInfo.direction : null,
      };
    });
}

function getHistoryPeriodItems(
  logs: HealthDailyLogRow[],
  key: SnapshotKey,
  timeframe: DetailTimeframe
): HistoryPeriodItem[] {
  const sortedLogs = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const snapshot = SNAPSHOT_DEFS.find((item) => item.key === key);

  if (timeframe === "daily") {
    return sortedLogs.map((log, index) => {
      const value = getMetricValueFromLog(log, key);
      const previousValue =
        index < sortedLogs.length - 1 ? getMetricValueFromLog(sortedLogs[index + 1], key) : value;
      const changeInfo = snapshot
        ? formatChange(snapshot.unit, value, previousValue)
        : { change: "", direction: "up" as const };

      return {
        key: log.log_date,
        label: formatHistoryDailyLabel(log.log_date),
        value,
        change: index < sortedLogs.length - 1 ? changeInfo.change : null,
        changeDirection: index < sortedLogs.length - 1 ? changeInfo.direction : null,
        logDate: log.log_date,
      };
    });
  }

  const grouped = new Map<string, number[]>();

  sortedLogs.forEach((log) => {
    const groupKey =
      timeframe === "weekly" ? startOfWeek(log.log_date) : getMonthKey(log.log_date);
    const values = grouped.get(groupKey) ?? [];
    values.push(getMetricValueFromLog(log, key));
    grouped.set(groupKey, values);
  });

  return [...grouped.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([groupKey, values], index, items) => {
      const value = average(values);
      const previousValue = index < items.length - 1 ? average(items[index + 1][1]) : value;
      const changeInfo = snapshot
        ? formatChange(snapshot.unit, value, previousValue)
        : { change: "", direction: "up" as const };

      return {
        key: groupKey,
        label: timeframe === "weekly" ? formatWeekLabel(groupKey) : formatMonthLabel(groupKey),
        value,
        change: index < items.length - 1 ? changeInfo.change : null,
        changeDirection: index < items.length - 1 ? changeInfo.direction : null,
      };
    });
}

function getWeightGraphPointsByMode(
  logs: HealthDailyLogRow[],
  width: number,
  height: number,
  mode: WeightViewMode
) {
  const sortedLogs = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));

  const weightSeries =
    mode === "weekly"
      ? sortedLogs.slice(-7).map((log, index, list) => ({
          label: formatShortDate(log.log_date),
          value: log.morning_weight_lb,
          averageValue: average(
            list
              .slice(Math.max(0, index - 6), index + 1)
              .map((entry) => entry.morning_weight_lb)
          ),
        }))
      : mode === "monthly"
        ? [...new Map(
            sortedLogs.map((log, index) => {
              const weekKey = startOfWeek(log.log_date);
              const currentWeekLogs = sortedLogs.filter(
                (entry) => startOfWeek(entry.log_date) === weekKey
              );
              const weekAverage = average(
                currentWeekLogs.map((entry) => entry.morning_weight_lb)
              );
              const trailingAverage = average(
                sortedLogs
                  .slice(Math.max(0, index - 6), index + 1)
                  .map((entry) => entry.morning_weight_lb)
              );

              return [
                weekKey,
                {
                  label: formatWeekLabel(weekKey),
                  value: weekAverage,
                  averageValue: trailingAverage,
                },
              ] as const;
            })
          ).values()].slice(-4)
        : [...new Map(
            sortedLogs.map((log, index) => {
              const monthKey = getMonthKey(log.log_date);
              const currentMonthLogs = sortedLogs.filter(
                (entry) => getMonthKey(entry.log_date) === monthKey
              );
              const monthAverage = average(
                currentMonthLogs.map((entry) => entry.morning_weight_lb)
              );
              const trailingAverage = average(
                sortedLogs
                  .slice(Math.max(0, index - 29), index + 1)
                  .map((entry) => entry.morning_weight_lb)
              );

              return [
                monthKey,
                {
                  label: formatShortMonthLabel(monthKey),
                  value: monthAverage,
                  averageValue: trailingAverage,
                },
              ] as const;
            })
          ).values()].slice(-12);

  if (weightSeries.length < 2) {
    return {
      dailyPoints: [] as ChartPoint[],
      averagePoints: [] as ChartPoint[],
      minValue: 0,
      maxValue: 0,
    };
  }

  const allValues = weightSeries.flatMap((item) => [item.value, item.averageValue]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = Math.max(1, maxValue - minValue);

  const toY = (value: number) => height - ((value - minValue) / range) * height;
  const stepX = width / Math.max(1, weightSeries.length - 1);

  const dailyPoints = weightSeries.map((item, index) => ({
    x: index * stepX,
    y: toY(item.value),
    label: item.label,
    value: item.value,
  }));

  const averagePoints = weightSeries.map((item, index) => ({
    x: index * stepX,
    y: toY(item.averageValue),
    label: item.label,
    value: item.averageValue,
  }));

  return {
    dailyPoints,
    averagePoints,
    minValue,
    maxValue,
  };
}

function getWeightChartLabels(points: ChartPoint[], mode: WeightViewMode) {
  if (mode === "monthly") {
    return points;
  }

  if (points.length <= 4) {
    return points;
  }

  return [
    points[0],
    points[Math.floor(points.length / 3)],
    points[Math.floor((points.length * 2) / 3)],
    points[points.length - 1],
  ];
}

function ChartLine({
  points,
  color,
}: {
  points: ChartPoint[];
  color: string;
}) {
  return (
    <>
      {points.slice(1).map((point, index) => {
        const previous = points[index];
        const deltaX = point.x - previous.x;
        const deltaY = point.y - previous.y;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);

        return (
          <View
            key={`${color}-${index}`}
            style={[
              styles.chartLineSegment,
              {
                backgroundColor: color,
                left: previous.x + deltaX / 2 - length / 2,
                top: previous.y + deltaY / 2 - 1,
                width: length,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}

      {points.map((point, index) => (
        <View
          key={`${color}-point-${index}`}
          style={[
            styles.chartPoint,
            {
              borderColor: color,
              left: point.x - 4,
              top: point.y - 4,
            },
          ]}
        />
      ))}
    </>
  );
}

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const updateFromPosition = (locationX: number) => {
    if (!trackWidth) {
      return;
    }

    const clampedX = Math.max(0, Math.min(trackWidth, locationX));
    const nextValue = Math.max(1, Math.min(10, Math.round((clampedX / trackWidth) * 9 + 1)));
    onChange(nextValue);
  };

  const handleSliderMove = (event: GestureResponderEvent) => {
    updateFromPosition(event.nativeEvent.locationX);
  };

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const fillWidth = trackWidth ? ((value - 1) / 9) * trackWidth : 0;

  return (
    <View style={styles.sliderCard}>
      <View style={styles.sliderHeader}>
        <Text style={styles.logFieldLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}/10</Text>
      </View>

      <View
        onLayout={handleTrackLayout}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleSliderMove}
        onResponderMove={handleSliderMove}
        onStartShouldSetResponder={() => true}
        style={styles.sliderTrack}
      >
        <View style={[styles.sliderFill, { width: fillWidth }]} />
        <View style={[styles.sliderThumb, { left: fillWidth }]} />
      </View>

      <View style={styles.sliderScale}>
        <Text style={styles.sliderScaleText}>1</Text>
        <Text style={styles.sliderScaleText}>10</Text>
      </View>
    </View>
  );
}

export function HealthHubScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const [activeHub, setActiveHub] = useState("Health");
  const [activeSection, setActiveSection] = useState<HealthSection>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [detailKey, setDetailKey] = useState<SnapshotKey | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailMode, setDetailMode] = useState<DetailMode>("history");
  const [detailTimeframe, setDetailTimeframe] = useState<DetailTimeframe>("daily");
  const [weightViewMode, setWeightViewMode] = useState<WeightViewMode>("weekly");
  const [detailSelectedDate, setDetailSelectedDate] = useState(getTodayKey());
  const [detailSelectedLog, setDetailSelectedLog] = useState<HealthDailyLogRow | null>(null);
  const [isLoadingDetailLog, setIsLoadingDetailLog] = useState(false);
  const [logVisible, setLogVisible] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState(getTodayKey());
  const [logDraft, setLogDraft] = useState<DailyLogDraft>(EMPTY_DAILY_LOG);
  const [lastLoggedDate, setLastLoggedDate] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<HealthDailyLogRow[]>([]);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [liftStartVisible, setLiftStartVisible] = useState(false);
  const [selectedLiftDay, setSelectedLiftDay] = useState(
    LIFT_DAY_PRESETS[getScheduledLiftDayIndex()].name
  );
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [dayPickerQuery, setDayPickerQuery] = useState("");
  const [activeLiftSession, setActiveLiftSession] = useState<LiftSession | null>(null);
  const [customExercisesByDay, setCustomExercisesByDay] = useState<Record<string, string[]>>({});
  const [completedLiftExercises, setCompletedLiftExercises] = useState<LiftCompletedExercise[]>([]);
  const [liftExerciseDraft, setLiftExerciseDraft] =
    useState<LiftExerciseDraft>(EMPTY_LIFT_EXERCISE_DRAFT);
  const menuProgress = useRef(new Animated.Value(0)).current;
  const detailProgress = useRef(new Animated.Value(0)).current;
  const logProgress = useRef(new Animated.Value(0)).current;
  const liftStartProgress = useRef(new Animated.Value(0)).current;
  const dayPickerProgress = useRef(new Animated.Value(0)).current;

  const todayKey = getTodayKey();
  const hasLoggedToday = lastLoggedDate === todayKey;
  const snapshotItems = getSnapshotItems(recentLogs);
  const activeSnapshot = snapshotItems.find((item) => item.key === detailKey) ?? null;
  const detailHistoryLogs = detailKey
    ? (
        detailKey === "weight"
          ? weightViewMode === "weekly"
            ? getHistoryPeriodItems(recentLogs, detailKey, "daily")
            : weightViewMode === "monthly"
              ? getHistoryPeriodItems(recentLogs, detailKey, "weekly")
              : getYearMonthItems(recentLogs, detailKey)
          : getHistoryPeriodItems(recentLogs, detailKey, detailTimeframe)
      ).slice(0, 5)
    : [];
  const weeklyDateKeys = getRecentDateKeys(7);
  const chartWidth = Math.max(220, windowWidth - 112);
  const chartHeight = 180;
  const weightGraph = getWeightGraphPointsByMode(
    recentLogs,
    chartWidth,
    chartHeight,
    weightViewMode
  );
  const weightChartLabels = getWeightChartLabels(weightGraph.dailyPoints, weightViewMode);
  const isLogComplete =
    logDraft.sleepHours.trim().length > 0 &&
    logDraft.morningWeight.trim().length > 0 &&
    logDraft.stepsYesterday.trim().length > 0;
  const scheduledLiftDay = LIFT_DAY_PRESETS[getScheduledLiftDayIndex()];
  const chosenLiftDay = selectedLiftDay;
  const liftDayOptions: LiftDaySelectorItem[] = LIFT_DAY_PRESETS;
  const selectedLiftPreset =
    liftDayOptions.find((preset) => preset.name === selectedLiftDay) ?? scheduledLiftDay;
  const currentExerciseOptions = activeLiftSession
    ? [
        ...(LIFT_EXERCISE_PRESETS[activeLiftSession.workoutType] ?? []),
        ...(customExercisesByDay[activeLiftSession.workoutType] ?? []),
      ]
    : [];
  const currentLiftSet =
    liftExerciseDraft.sets[liftExerciseDraft.activeSetIndex] ?? EMPTY_LIFT_SET_DRAFT;
  const normalizedExerciseQuery = liftExerciseDraft.exerciseQuery.trim().toLowerCase();
  const exerciseSuggestions = (
    normalizedExerciseQuery
      ? currentExerciseOptions.filter((exercise) =>
          exercise.toLowerCase().includes(normalizedExerciseQuery)
        )
      : currentExerciseOptions
  ).slice(0, 3);
  const normalizedDayPickerQuery = dayPickerQuery.trim().toLowerCase();
  const filteredLiftDayOptions = normalizedDayPickerQuery
    ? liftDayOptions.filter((preset) =>
        [preset.name, preset.goal, preset.focus, ...preset.exercises]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDayPickerQuery)
      )
    : liftDayOptions;

  useEffect(() => {
    void hydrateFromDatabase();
  }, []);

  async function hydrateFromDatabase() {
    setIsLoading(true);
    setSyncMessage(null);

    try {
      const [logs, todayLog] = await Promise.all([
        fetchRecentHealthDailyLogs(120),
        fetchHealthDailyLog(todayKey),
      ]);

      setRecentLogs(logs);

      if (todayLog) {
        setLastLoggedDate(todayKey);
        setLogDraft(toDraft(todayLog));
      }
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Unable to load Health data.");
    } finally {
      setIsLoading(false);
    }
  }

  const openMenu = () => {
    setMenuVisible(true);
    setMenuOpen(true);

    Animated.timing(menuProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    setMenuOpen(false);

    Animated.timing(menuProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const openDetail = (key: SnapshotKey) => {
    setDetailKey(key);
    setDetailMode("history");
    setDetailTimeframe("daily");
    setWeightViewMode("weekly");
    setDetailSelectedDate(todayKey);
    setDetailSelectedLog(null);
    setDetailVisible(true);

    Animated.timing(detailProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDetail = () => {
    Animated.timing(detailProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDetailVisible(false);
        setDetailKey(null);
        setDetailMode("history");
        setDetailTimeframe("daily");
        setWeightViewMode("weekly");
        setDetailSelectedDate(todayKey);
        setDetailSelectedLog(null);
      }
    });
  };

  const openDailyLog = () => {
    setSelectedLogDate(todayKey);
    setLogVisible(true);

    Animated.timing(logProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const openDailyLogForDate = (logDate: string) => {
    setSelectedLogDate(logDate);
    setLogVisible(true);

    Animated.timing(logProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDailyLog = () => {
    Animated.timing(logProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setLogVisible(false);
      }
    });
  };

  const openLiftStart = () => {
    setSelectedLiftDay(scheduledLiftDay.name);
    setLiftStartVisible(true);

    Animated.timing(liftStartProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const openDayPicker = () => {
    setDayPickerVisible(true);

    Animated.timing(dayPickerProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDayPicker = () => {
    Animated.timing(dayPickerProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDayPickerVisible(false);
        setDayPickerQuery("");
      }
    });
  };

  const closeLiftStart = () => {
    Animated.timing(liftStartProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setLiftStartVisible(false);
      }
    });
  };

  const startLiftSession = () => {
    if (!chosenLiftDay) {
      return;
    }

    setActiveLiftSession({
      startedAt: getTodayKey(),
      workoutType: chosenLiftDay,
    });
    setCompletedLiftExercises([]);
    setLiftExerciseDraft(EMPTY_LIFT_EXERCISE_DRAFT);
    closeLiftStart();
  };

  const selectLiftExercise = (exercise: string) => {
    setLiftExerciseDraft((current) => ({
      ...current,
      exerciseQuery: exercise,
      selectedExercise: exercise,
      isEditingExercise: false,
      customExercise: "",
      isAddingExercise: false,
      activeSetIndex: 0,
    }));
  };

  const saveCustomExercise = () => {
    if (!activeLiftSession) {
      return;
    }

    const nextExercise = liftExerciseDraft.customExercise.trim();
    if (!nextExercise) {
      return;
    }

    const currentOptions = [
      ...(LIFT_EXERCISE_PRESETS[activeLiftSession.workoutType] ?? []),
      ...(customExercisesByDay[activeLiftSession.workoutType] ?? []),
    ];

    if (!currentOptions.includes(nextExercise)) {
      setCustomExercisesByDay((current) => ({
        ...current,
        [activeLiftSession.workoutType]: [
          ...(current[activeLiftSession.workoutType] ?? []),
          nextExercise,
        ],
      }));
    }

    selectLiftExercise(nextExercise);
  };

  const endLiftSession = () => {
    setActiveLiftSession(null);
    setCompletedLiftExercises([]);
    setLiftExerciseDraft(EMPTY_LIFT_EXERCISE_DRAFT);
  };

  const updateActiveLiftSet = (updater: (set: LiftSetDraft) => LiftSetDraft) => {
    setLiftExerciseDraft((current) => ({
      ...current,
      sets: current.sets.map((set, index) =>
        index === current.activeSetIndex ? updater(set) : set
      ),
    }));
  };

  const nextLiftSet = () => {
    setLiftExerciseDraft((current) => {
      const nextSets = [...current.sets, { ...EMPTY_LIFT_SET_DRAFT }];
      return {
        ...current,
        sets: nextSets,
        activeSetIndex: nextSets.length - 1,
      };
    });
  };

  const nextLiftExercise = () => {
    const selectedExercise = liftExerciseDraft.selectedExercise;
    if (!selectedExercise) {
      return;
    }

    setCompletedLiftExercises((current) => [
      ...current,
      {
        exerciseName: selectedExercise,
        setCount: liftExerciseDraft.sets.length,
        sets: liftExerciseDraft.sets,
      },
    ]);
    setLiftExerciseDraft(EMPTY_LIFT_EXERCISE_DRAFT);
  };

  async function loadLogForDate(logDate: string) {
    setSyncMessage(null);

    try {
      const existingLog = await fetchHealthDailyLog(logDate);

      if (existingLog) {
        setLogDraft(toDraft(existingLog));
      } else {
        setLogDraft(EMPTY_DAILY_LOG);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load the selected log date.";
      setSyncMessage(message);
      setErrorPopup("That date could not be loaded. Please try again.");
    }
  }

  async function loadDetailLogForDate(logDate: string) {
    if (!isValidDateKey(logDate)) {
      setDetailSelectedLog(null);
      return;
    }

    setIsLoadingDetailLog(true);
    setSyncMessage(null);

    try {
      const existingLog = await fetchHealthDailyLog(logDate);
      setDetailSelectedLog(existingLog);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load the selected entry.";
      setSyncMessage(message);
      setErrorPopup("That entry could not be loaded. Please try again.");
    } finally {
      setIsLoadingDetailLog(false);
    }
  }

  useEffect(() => {
    if (!detailVisible || detailMode !== "edit") {
      return;
    }

    if (!isValidDateKey(detailSelectedDate)) {
      setDetailSelectedLog(null);
      return;
    }

    void loadDetailLogForDate(detailSelectedDate);
  }, [detailMode, detailSelectedDate, detailVisible]);

  useEffect(() => {
    if (!logVisible) {
      return;
    }

    if (!isValidDateKey(selectedLogDate)) {
      setLogDraft(EMPTY_DAILY_LOG);
      return;
    }

    void loadLogForDate(selectedLogDate);
  }, [logVisible, selectedLogDate]);

  async function saveDailyLog() {
    if (!isLogComplete) {
      return;
    }

    setSyncMessage(null);
    closeDailyLog();

    try {
      setIsSavingLog(true);

      const savedLog = await upsertHealthDailyLog({
        log_date: selectedLogDate,
        sleep_hours: Number(logDraft.sleepHours),
        morning_weight_lb: Number(logDraft.morningWeight),
        steps_yesterday: Number(logDraft.stepsYesterday),
        soreness: logDraft.soreness,
        energy: logDraft.energy,
      });

      const nextLogs = [
        savedLog,
        ...recentLogs.filter((log) => log.log_date !== savedLog.log_date),
      ].sort((a, b) => b.log_date.localeCompare(a.log_date));

      setRecentLogs(nextLogs.slice(0, 120));
      if (selectedLogDate === todayKey) {
        setLastLoggedDate(todayKey);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Daily log did not save.";
      setSyncMessage(message);
      setErrorPopup("Daily log did not save. Please try again.");
    } finally {
      setIsSavingLog(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBarShell}>
        <View style={styles.topBar}>
          <View style={styles.hubTitle}>
            <Text style={styles.hubNameAccent}>{activeHub}</Text>
            <Text style={styles.hubNameBase}>hub</Text>
          </View>
          <Pressable
            accessibilityLabel="Open hub menu"
            onPress={openMenu}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.menuButtonPressed,
            ]}
          >
            <View style={styles.menuIcon}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
          </Pressable>
        </View>
        <View style={styles.navDivider} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bodyBlock}>
          <Text style={styles.kicker}>Welcome to Health Hub:</Text>
          <View style={styles.sectionSwitchRow}>
            {HEALTH_SECTIONS.map((section) => (
              <Pressable
                key={section}
                onPress={() => setActiveSection(section)}
                style={({ pressed }) => [
                  styles.sectionSwitch,
                  activeSection === section && styles.sectionSwitchActive,
                  pressed && styles.sectionSwitchPressed,
                ]}
              >
                <Text
                  style={[
                    styles.sectionSwitchText,
                    activeSection === section && styles.sectionSwitchTextActive,
                  ]}
                >
                  {section}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

      {syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null}
      {isLoading ? <Text style={styles.syncHint}>Loading Health data...</Text> : null}

        {activeSection === "Overview" ? (
          <HealthOverviewTab
            hasLoggedToday={hasLoggedToday}
            onOpenDetail={openDetail}
            snapshotItems={snapshotItems}
            styles={styles}
          />
        ) : null}

        {activeSection === "Lift" ? (
          <HealthLiftTab
            activeLiftSession={activeLiftSession}
            completedLiftExercises={completedLiftExercises}
            currentSet={currentLiftSet}
            exerciseDraft={liftExerciseDraft}
            exerciseSuggestions={exerciseSuggestions}
            onChangeCustomExercise={(value) =>
              setLiftExerciseDraft((current) => ({ ...current, customExercise: value }))
            }
            onChangeExerciseQuery={(value) =>
              setLiftExerciseDraft((current) => ({
                ...current,
                exerciseQuery: value,
                isEditingExercise: true,
                selectedExercise:
                  current.selectedExercise &&
                  current.selectedExercise.toLowerCase() === value.trim().toLowerCase()
                    ? current.selectedExercise
                    : null,
              }))
            }
            onChangeRepsText={(value) =>
              updateActiveLiftSet((set) => ({
                ...set,
                reps: Math.max(0, Number(value.replace(/[^0-9]/g, "")) || 0),
              }))
            }
            onDecreaseAssistedReps={() =>
              updateActiveLiftSet((set) => ({
                ...set,
                assistedReps: Math.max(0, set.assistedReps - 1),
              }))
            }
            onDecreaseNegativeReps={() =>
              updateActiveLiftSet((set) => ({
                ...set,
                negativeReps: Math.max(0, set.negativeReps - 1),
              }))
            }
            onDecreaseReps={() => updateActiveLiftSet((set) => ({ ...set, reps: Math.max(0, set.reps - 1) }))}
            onOpenCustomExercise={() =>
              setLiftExerciseDraft((current) => ({
                ...current,
                isEditingExercise: true,
                isAddingExercise: true,
                selectedExercise: null,
              }))
            }
            onEditExercise={() =>
              setLiftExerciseDraft((current) => ({
                ...current,
                isEditingExercise: true,
                exerciseQuery: current.selectedExercise ?? current.exerciseQuery,
              }))
            }
            onIncreaseAssistedReps={() =>
              updateActiveLiftSet((set) => ({ ...set, assistedReps: set.assistedReps + 1 }))
            }
            onIncreaseNegativeReps={() =>
              updateActiveLiftSet((set) => ({ ...set, negativeReps: set.negativeReps + 1 }))
            }
            onIncreaseReps={() => updateActiveLiftSet((set) => ({ ...set, reps: set.reps + 1 }))}
            onJumpToSet={(index) =>
              setLiftExerciseDraft((current) => ({ ...current, activeSetIndex: index }))
            }
            onNextExercise={nextLiftExercise}
            onNextSet={nextLiftSet}
            onSaveCustomExercise={saveCustomExercise}
            onSelectExercise={selectLiftExercise}
            onToggleDropset={() => updateActiveLiftSet((set) => ({ ...set, dropset: !set.dropset }))}
            styles={styles}
          />
        ) : null}

        {activeSection === "Diet" ? (
          <HealthDietTab styles={styles} />
        ) : null}
      </ScrollView>

      {activeSection === "Overview" ? (
        <Pressable
          accessibilityLabel={hasLoggedToday ? "Edit daily log" : "Add daily log"}
          onPress={openDailyLog}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Text style={styles.fabText}>
            {hasLoggedToday ? "Edit daily log" : "Add daily log"}
          </Text>
        </Pressable>
      ) : null}

      {activeSection === "Lift" ? (
        <Pressable
          accessibilityLabel={activeLiftSession ? "End lift" : "Start lift"}
          onPress={activeLiftSession ? endLiftSession : openLiftStart}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Text style={styles.fabText}>
            {activeLiftSession ? "End lift" : "Start lift"}
          </Text>
        </Pressable>
      ) : null}

      {logVisible ? (
        <Animated.View
          style={[
            styles.logOverlay,
            {
              transform: [
                {
                  translateY: logProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.logTopBar}>
            <Pressable
              accessibilityLabel="Close daily log"
              onPress={closeDailyLog}
              style={({ pressed }) => [
                styles.logCloseButton,
                pressed && styles.logCloseButtonPressed,
              ]}
            >
              <Text style={styles.logCloseButtonText}>X</Text>
            </Pressable>
            <View style={styles.logTitleWrap}>
              <Text style={styles.logTitle}>
                {selectedLogDate === todayKey && hasLoggedToday
                  ? "Edit daily log"
                  : "Add daily log"}
              </Text>
              <Text style={styles.logCaption}>{formatLongDate(selectedLogDate)}</Text>
            </View>
            <View style={styles.detailSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.logContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logIntroCard}>
              <Text style={styles.logIntroTitle}>Physical check-in</Text>
              <Text style={styles.logIntroBody}>
                Enter the core daily health inputs for this date so your snapshot
                stays current.
              </Text>
            </View>

            <View style={styles.logFieldCard}>
              <Text style={styles.logFieldLabel}>Log date</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setSelectedLogDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8d8a81"
                style={styles.logInput}
                value={selectedLogDate}
              />
            </View>

            <View style={styles.logFieldCard}>
              <Text style={styles.logFieldLabel}>Sleep last night</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(sleepHours) =>
                  setLogDraft((draft) => ({ ...draft, sleepHours }))
                }
                placeholder="Enter hours slept"
                placeholderTextColor="#8d8a81"
                style={styles.logInput}
                value={logDraft.sleepHours}
              />
            </View>

            <View style={styles.logFieldCard}>
              <Text style={styles.logFieldLabel}>Morning weight</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(morningWeight) =>
                  setLogDraft((draft) => ({ ...draft, morningWeight }))
                }
                placeholder="Enter morning weight"
                placeholderTextColor="#8d8a81"
                style={styles.logInput}
                value={logDraft.morningWeight}
              />
            </View>

            <View style={styles.logFieldCard}>
              <Text style={styles.logFieldLabel}>Steps yesterday</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(stepsYesterday) =>
                  setLogDraft((draft) => ({ ...draft, stepsYesterday }))
                }
                placeholder="Enter steps from yesterday"
                placeholderTextColor="#8d8a81"
                style={styles.logInput}
                value={logDraft.stepsYesterday}
              />
            </View>

            <ScoreSlider
              label="Soreness"
              onChange={(soreness) => setLogDraft((draft) => ({ ...draft, soreness }))}
              value={logDraft.soreness}
            />

            <ScoreSlider
              label="Morning energy"
              onChange={(energy) => setLogDraft((draft) => ({ ...draft, energy }))}
              value={logDraft.energy}
            />

            <Pressable
              accessibilityLabel="Save daily log"
              disabled={!isLogComplete || isSavingLog}
              onPress={() => void saveDailyLog()}
              style={({ pressed }) => [
                styles.logSaveButton,
                (!isLogComplete || isSavingLog) && styles.logSaveButtonDisabled,
                pressed && isLogComplete && !isSavingLog && styles.logSaveButtonPressed,
              ]}
            >
              <Text style={styles.logSaveButtonText}>
                {isSavingLog
                  ? "Saving..."
                  : selectedLogDate === todayKey && hasLoggedToday
                    ? "Update today"
                    : "Save log"}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      ) : null}

      {detailVisible && activeSnapshot ? (
        <Animated.View
          style={[
            styles.detailOverlay,
            {
              transform: [
                {
                  translateX: detailProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.detailTopBar}>
            <Pressable
              accessibilityLabel="Back to dashboard"
              onPress={closeDetail}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.detailTitle}>{activeSnapshot.label}</Text>
            <View style={styles.detailSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailHero}>
              <Text style={styles.metricLabel}>Last 7 days</Text>
              <Text style={styles.detailValue}>{activeSnapshot.value}</Text>
              <Text style={styles.detailDelta}>
                {activeSnapshot.changeDirection === "up" ? "↑" : "↓"} {activeSnapshot.change} vs
                previous 7 days
              </Text>
            </View>

            <View style={styles.detailActionRow}>
              <Pressable
                onPress={() => {
                  closeDetail();
                  openDailyLogForDate(todayKey);
                }}
                style={({ pressed }) => [
                  styles.detailActionButton,
                  pressed && styles.detailActionButtonPressed,
                ]}
              >
                <Text style={styles.detailActionButtonText}>Record entry</Text>
              </Pressable>

              <Pressable
                onPress={() => setDetailMode("edit")}
                style={({ pressed }) => [
                  styles.detailActionButton,
                  detailMode === "edit" && styles.detailActionButtonActive,
                  pressed && styles.detailActionButtonPressed,
                ]}
              >
                <Text style={styles.detailActionButtonText}>Edit entries</Text>
              </Pressable>
            </View>

            {activeSnapshot.key === "weight" && weightGraph.dailyPoints.length ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Bodyweight trend</Text>
                <View style={styles.weightChartModeRow}>
                  {(["weekly", "monthly", "yearly"] as const).map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => setWeightViewMode(mode)}
                      style={({ pressed }) => [
                        styles.weightChartModeButton,
                        weightViewMode === mode && styles.weightChartModeButtonActive,
                        pressed && styles.weightChartModeButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weightChartModeButtonText,
                          weightViewMode === mode &&
                            styles.weightChartModeButtonTextActive,
                        ]}
                      >
                        {mode[0].toUpperCase() + mode.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.chartLegendRow}>
                  <View style={styles.chartLegendItem}>
                    <View
                      style={[
                        styles.chartLegendSwatch,
                        styles.chartLegendSwatchDaily,
                      ]}
                    />
                    <Text style={styles.chartLegendText}>Bodyweight</Text>
                  </View>
                  <View style={styles.chartLegendItem}>
                    <View
                      style={[
                        styles.chartLegendSwatch,
                        styles.chartLegendSwatchAverage,
                      ]}
                    />
                    <Text style={styles.chartLegendText}>7-day average</Text>
                  </View>
                </View>

                <View style={[styles.chartCard, { height: chartHeight + 56 }]}>
                  <View style={styles.chartGrid}>
                    <Text style={styles.chartAxisLabel}>
                      {weightGraph.maxValue.toFixed(1)} lb
                    </Text>
                    <Text style={styles.chartAxisLabel}>
                      {weightGraph.minValue.toFixed(1)} lb
                    </Text>
                  </View>

                  <View style={[styles.chartPlot, { width: chartWidth, height: chartHeight }]}>
                    <View style={styles.chartGuideTop} />
                    <View style={styles.chartGuideMiddle} />
                    <View style={styles.chartGuideBottom} />
                    <ChartLine color="#8f4943" points={weightGraph.dailyPoints} />
                    <ChartLine color="#5d8455" points={weightGraph.averagePoints} />
                  </View>

                  <View style={styles.chartLabelRow}>
                    {weightChartLabels.map((point, index) => (
                      <Text key={`${point.label}-${index}`} style={styles.chartBottomLabel}>
                        {point.label}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {detailMode === "edit" ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Edit entries</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateChipRow}
                >
                  {weeklyDateKeys.map((dateKey) => (
                    <Pressable
                      key={dateKey}
                      onPress={() => setDetailSelectedDate(dateKey)}
                      style={({ pressed }) => [
                        styles.dateChip,
                        detailSelectedDate === dateKey && styles.dateChipActive,
                        pressed && styles.dateChipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateChipLabel,
                          detailSelectedDate === dateKey && styles.dateChipLabelActive,
                        ]}
                      >
                        {formatShortDate(dateKey)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <TextInput
                  autoCapitalize="none"
                  onChangeText={setDetailSelectedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8d8a81"
                  style={styles.logInput}
                  value={detailSelectedDate}
                />

                {isLoadingDetailLog ? (
                  <Text style={styles.syncHint}>Loading entry...</Text>
                ) : detailSelectedLog ? (
                  <View style={styles.metricPreviewCard}>
                    <Text style={styles.metricPreviewDate}>{formatLongDate(detailSelectedDate)}</Text>
                    <Text style={styles.metricPreviewValue}>
                      {formatMetricLogValue(
                        activeSnapshot.key,
                        getMetricValueFromLog(detailSelectedLog, activeSnapshot.key)
                      )}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.metricPreviewCard}>
                    <Text style={styles.metricPreviewDate}>{formatLongDate(detailSelectedDate)}</Text>
                    <Text style={styles.metricPreviewEmpty}>No entry for this day yet</Text>
                  </View>
                )}

                <Pressable
                  disabled={!isValidDateKey(detailSelectedDate)}
                  onPress={() => {
                    closeDetail();
                    openDailyLogForDate(detailSelectedDate);
                  }}
                  style={({ pressed }) => [
                    styles.inlineActionButton,
                    !isValidDateKey(detailSelectedDate) && styles.inlineActionButtonDisabled,
                    pressed &&
                      isValidDateKey(detailSelectedDate) &&
                      styles.inlineActionButtonPressed,
                  ]}
                >
                  <Text style={styles.inlineActionButtonText}>
                    {detailSelectedLog ? "Edit this day" : "Record for this day"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Recent history</Text>
              {activeSnapshot.key !== "weight" ? (
                <View style={styles.historyTimeframeRow}>
                  {(["daily", "weekly", "monthly"] as const).map((timeframe) => (
                    <Pressable
                      key={timeframe}
                      onPress={() => setDetailTimeframe(timeframe)}
                      style={({ pressed }) => [
                        styles.historyTimeframeButton,
                        detailTimeframe === timeframe && styles.historyTimeframeButtonActive,
                        pressed && styles.historyTimeframeButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyTimeframeButtonText,
                          detailTimeframe === timeframe &&
                            styles.historyTimeframeButtonTextActive,
                        ]}
                      >
                        {timeframe[0].toUpperCase() + timeframe.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {detailHistoryLogs.length ? (
                <View style={styles.historyList}>
                  {detailHistoryLogs.map((log) => (
                    <Pressable
                      key={log.key}
                      onPress={() => {
                        const isWeightDailyEdit =
                          activeSnapshot.key === "weight" && weightViewMode === "weekly";

                        if (
                          (!isWeightDailyEdit && detailTimeframe !== "daily") ||
                          !log.logDate
                        ) {
                          return;
                        }

                        setDetailMode("edit");
                        setDetailSelectedDate(log.logDate);
                      }}
                      style={({ pressed }) => [
                        styles.historyRow,
                        pressed && styles.historyRowPressed,
                      ]}
                    >
                      <View style={styles.historyRowCopy}>
                        <Text style={styles.historyRowDate}>{log.label}</Text>
                        <Text style={styles.historyRowHint}>
                          {(activeSnapshot.key === "weight" && weightViewMode === "weekly") ||
                          (activeSnapshot.key !== "weight" && detailTimeframe === "daily")
                            ? "Tap to edit this day"
                            : activeSnapshot.key === "weight"
                              ? `Average for this ${weightViewMode === "monthly" ? "week" : "month"}`
                              : `Average for this ${detailTimeframe === "weekly" ? "week" : "month"}`}
                        </Text>
                      </View>
                      <View style={styles.historyRowMeta}>
                        <Text style={styles.historyRowValue}>
                          {formatMetricLogValue(activeSnapshot.key, log.value)}
                        </Text>
                        {log.change ? (
                          <Text
                            style={[
                              styles.historyRowChange,
                              log.changeDirection === "down" && styles.historyRowChangeDown,
                            ]}
                          >
                            {log.changeDirection === "up" ? "↑" : "↓"} {log.change}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.detailCardBody}>
                  No saved history for this metric yet.
                </Text>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      ) : null}

      {menuVisible ? (
        <Animated.View
          pointerEvents={menuOpen ? "auto" : "none"}
          style={[
            styles.menuOverlay,
            {
              opacity: menuProgress,
              transform: [
                {
                  translateY: menuProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.menuSheet}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Choose a hub</Text>
              <Text style={styles.menuCaption}>Move through the system from here.</Text>
            </View>

            <View style={styles.menuList}>
              {HUBS.map((hub) => (
                <Pressable
                  key={hub}
                  onPress={() => {
                    setActiveHub(hub);
                    closeMenu();
                  }}
                  style={({ pressed }) => [
                    styles.menuRow,
                    hub === activeHub && styles.menuRowActive,
                    pressed && styles.menuRowPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuRowText,
                      hub === activeHub && styles.menuRowTextActive,
                    ]}
                  >
                    {hub}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityLabel="Close hub menu"
              onPress={closeMenu}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {liftStartVisible ? (
        <Animated.View
          style={[
            styles.detailOverlay,
            {
              transform: [
                {
                  translateX: liftStartProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.detailTopBar}>
            <Pressable
              accessibilityLabel="Back to lift tab"
              onPress={closeLiftStart}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.detailTitle}>Start lift</Text>
            <View style={styles.detailSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logIntroCard}>
              <Text style={styles.logIntroTitle}>Choose your training day</Text>
              <Text style={styles.logIntroBody}>
                Start from the scheduled split day, or override it from the selector.
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Suggested day</Text>
              <Pressable
                accessibilityLabel="Open lift day picker"
                onPress={openDayPicker}
                style={({ pressed }) => [
                  styles.daySelectorButton,
                  pressed && styles.daySelectorButtonPressed,
                ]}
              >
                <View style={styles.daySelectorCopy}>
                  <Text style={styles.daySelectorLabel}>On schedule for today</Text>
                  <Text style={styles.daySelectorTitle}>{selectedLiftPreset.name}</Text>
                  <Text style={styles.daySelectorBody}>{selectedLiftPreset.goal}</Text>
                </View>
                <Text style={styles.daySelectorChevron}>›</Text>
              </Pressable>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Ready to start</Text>
              <Text style={styles.detailCardBody}>
                {chosenLiftDay
                  ? `${chosenLiftDay} for ${formatLongDate(todayKey)}`
                  : "Choose a split day to begin."}
              </Text>
              <View style={styles.readyExerciseList}>
                {selectedLiftPreset.exercises.slice(0, 4).map((exercise) => (
                  <Text key={exercise} style={styles.readyExerciseText}>
                    {exercise}
                  </Text>
                ))}
              </View>
            </View>

            <Pressable
              disabled={!chosenLiftDay}
              onPress={startLiftSession}
              style={({ pressed }) => [
                styles.logSaveButton,
                !chosenLiftDay && styles.logSaveButtonDisabled,
                pressed && chosenLiftDay && styles.logSaveButtonPressed,
              ]}
            >
              <Text style={styles.logSaveButtonText}>Start lift</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      ) : null}

      {dayPickerVisible ? (
        <Animated.View
          style={[
            styles.detailOverlay,
            {
              transform: [
                {
                  translateX: dayPickerProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.detailTopBar}>
            <Pressable
              accessibilityLabel="Back to start lift"
              onPress={closeDayPicker}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.detailTitle}>Choose day</Text>
            <View style={styles.detailSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logFieldCard}>
              <Text style={styles.logFieldLabel}>Search presets</Text>
              <TextInput
                onChangeText={setDayPickerQuery}
                placeholder="Search by day, goal, or lift"
                placeholderTextColor="#8d8a81"
                style={styles.logInput}
                value={dayPickerQuery}
              />
            </View>

            <View style={styles.dayPickerList}>
              {filteredLiftDayOptions.map((preset) => (
                <Pressable
                  key={preset.name}
                  onPress={() => {
                    setSelectedLiftDay(preset.name);
                    closeDayPicker();
                  }}
                  style={({ pressed }) => [
                    styles.dayPickerCard,
                    selectedLiftDay === preset.name && styles.dayPickerCardActive,
                    pressed && styles.dayPickerCardPressed,
                  ]}
                >
                  <View style={styles.dayPickerTopRow}>
                    <View style={styles.dayPickerBadge}>
                      <Text style={styles.dayPickerBadgeText}>{preset.shortLabel}</Text>
                    </View>
                    <Text style={styles.dayPickerTitle}>{preset.name}</Text>
                  </View>
                  <Text style={styles.dayPickerGoal}>{preset.goal}</Text>
                  <Text style={styles.dayPickerFocus}>{preset.focus}</Text>
                  <Text style={styles.dayPickerExerciseLine}>
                    {preset.exercises.slice(0, 4).join(" • ")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      ) : null}

      {errorPopup ? (
        <View style={styles.errorPopupWrap} pointerEvents="box-none">
          <View style={styles.errorPopup}>
            <Text style={styles.errorPopupTitle}>Save failed</Text>
            <Text style={styles.errorPopupBody}>{errorPopup}</Text>
            <Pressable
              onPress={() => setErrorPopup(null)}
              style={({ pressed }) => [
                styles.errorPopupButton,
                pressed && styles.errorPopupButtonPressed,
              ]}
            >
              <Text style={styles.errorPopupButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3ecdf",
  },
  topBarShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: "#efe1dc",
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hubTitle: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  hubNameAccent: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#8f4943",
  },
  hubNameBase: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "500",
    color: "#1d1d1b",
  },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  menuIcon: {
    gap: 4,
  },
  menuLine: {
    width: 18,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#6b4a45",
  },
  navDivider: {
    height: 1,
    backgroundColor: "#d6bbb2",
    marginTop: 16,
  },
  scrollContent: {
    paddingTop: 115,
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 18,
  },
  bodyBlock: {
    gap: 12,
  },
  kicker: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500",
    color: "#6b4a45",
  },
  sectionSwitchRow: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d5c2b8",
    backgroundColor: "#f7eee9",
    overflow: "hidden",
  },
  sectionSwitch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  sectionSwitchActive: {
    backgroundColor: "#ead9d3",
  },
  sectionSwitchPressed: {
    backgroundColor: "#f2e4df",
  },
  sectionSwitchText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: "#34423f",
  },
  sectionSwitchTextActive: {
    color: "#6b3f3a",
  },
  syncMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8f4943",
  },
  syncHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6a716b",
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8a6a3f",
  },
  snapshotBlock: {
    gap: 14,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "600",
    color: "#24313a",
  },
  loggedBadge: {
    borderRadius: 999,
    backgroundColor: "#ead9d3",
    borderWidth: 1,
    borderColor: "#cfb2aa",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  loggedBadgeText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: "#6b3f3a",
  },
  snapshotList: {
    gap: 12,
  },
  snapshotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fbf7ef",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 18,
  },
  snapshotRowPressed: {
    backgroundColor: "#f4ebde",
  },
  snapshotCopy: {
    flex: 1,
    gap: 6,
  },
  snapshotLabel: {
    fontSize: 14,
    lineHeight: 19,
    color: "#6a716b",
  },
  snapshotValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#24313a",
  },
  snapshotDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  snapshotDeltaArrow: {
    fontSize: 15,
    lineHeight: 18,
    color: "#5d8455",
    fontWeight: "700",
  },
  snapshotDeltaDown: {
    color: "#8f4943",
  },
  snapshotDeltaText: {
    fontSize: 14,
    lineHeight: 19,
    color: "#5c6862",
  },
  snapshotChevron: {
    fontSize: 30,
    lineHeight: 32,
    color: "#8a6a3f",
  },
  placeholderCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 22,
    gap: 10,
  },
  placeholderTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    color: "#24313a",
  },
  placeholderBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f5d57",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    borderRadius: 20,
    backgroundColor: "#8f4943",
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#6f624f",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 12,
  },
  fabPressed: {
    backgroundColor: "#7d3f3a",
  },
  fabText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#fff7f3",
  },
  logOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 24,
    backgroundColor: "#f3ecdf",
  },
  logTopBar: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#efe1dc",
  },
  logCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    alignItems: "center",
    justifyContent: "center",
  },
  logCloseButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  logCloseButtonText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "600",
    color: "#6b4a45",
  },
  logTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  logTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#24313a",
  },
  logCaption: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: "#6a716b",
  },
  logContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  logIntroCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 20,
    gap: 8,
  },
  logIntroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    color: "#24313a",
  },
  logIntroBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f5d57",
  },
  logFieldCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 18,
    gap: 10,
  },
  logFieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: "#34423f",
  },
  logInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    lineHeight: 22,
    color: "#24313a",
  },
  dateLoadButton: {
    alignSelf: "flex-start",
    borderRadius: 14,
    backgroundColor: "#ead9d3",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateLoadButtonPressed: {
    backgroundColor: "#dec7bf",
  },
  dateLoadButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#6b3f3a",
  },
  sliderCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 18,
    gap: 12,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sliderValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#6b3f3a",
  },
  sliderTrack: {
    height: 18,
    borderRadius: 999,
    backgroundColor: "#eadfce",
    justifyContent: "center",
    overflow: "visible",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#c78a82",
  },
  sliderThumb: {
    position: "absolute",
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#8f4943",
    backgroundColor: "#fff7f3",
  },
  sliderScale: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderScaleText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#7a7a72",
  },
  logSaveButton: {
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: "#8f4943",
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  logSaveButtonDisabled: {
    backgroundColor: "#c5b0aa",
  },
  logSaveButtonPressed: {
    backgroundColor: "#7d3f3a",
  },
  logSaveButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#fff7f3",
  },
  liftPresetList: {
    gap: 10,
  },
  daySelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  daySelectorButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  daySelectorCopy: {
    flex: 1,
    gap: 4,
  },
  daySelectorLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#6b4a45",
  },
  daySelectorTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "600",
    color: "#24313a",
  },
  daySelectorBody: {
    fontSize: 15,
    lineHeight: 21,
    color: "#4f5d57",
  },
  daySelectorChevron: {
    fontSize: 28,
    lineHeight: 32,
    color: "#8a6a3f",
  },
  readyExerciseList: {
    marginTop: 12,
    gap: 8,
  },
  readyExerciseText: {
    fontSize: 14,
    lineHeight: 19,
    color: "#5c6862",
  },
  liftPresetRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  liftPresetRowActive: {
    backgroundColor: "#ead9d3",
    borderColor: "#cfb2aa",
  },
  liftPresetRowPressed: {
    backgroundColor: "#f0e1dc",
  },
  liftPresetText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: "#34423f",
  },
  liftPresetTextActive: {
    color: "#6b3f3a",
  },
  liftPresetAddRow: {
    justifyContent: "center",
  },
  liftPresetAddText: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "500",
    color: "#6b3f3a",
  },
  liftCustomComposer: {
    marginTop: 12,
    gap: 10,
  },
  liftCustomSaveButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    backgroundColor: "#8f4943",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  liftCustomSaveButtonPressed: {
    backgroundColor: "#7d3f3a",
  },
  liftCustomSaveButtonText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    color: "#fff7f3",
  },
  liftSessionNote: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6a716b",
  },
  liftSetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  liftEditButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liftEditButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  liftEditButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#6b3f3a",
  },
  liftHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liftSetTabs: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  liftSetTab: {
    minWidth: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  liftSetTabActive: {
    backgroundColor: "#ead9d3",
    borderColor: "#cfb2aa",
  },
  liftSetTabPressed: {
    backgroundColor: "#f0e1dc",
  },
  liftSetTabText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: "#4f5d57",
  },
  liftSetTabTextActive: {
    color: "#6b3f3a",
  },
  liftInlineDivider: {
    height: 1,
    backgroundColor: "#ddcfbb",
    marginVertical: 4,
  },
  liftMetricCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    padding: 16,
    gap: 12,
  },
  liftCounterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  liftCounterButton: {
    width: 52,
    height: 52,
    flexShrink: 0,
  },
  liftCounterInput: {
    flex: 1,
    flexBasis: 0,
    width: 0,
    minWidth: 0,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  liftCounterPill: {
    minWidth: 72,
    flex: 1,
  },
  liftToggleButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  liftToggleButtonActive: {
    backgroundColor: "#ead9d3",
    borderColor: "#b98d84",
  },
  liftToggleButtonPressed: {
    backgroundColor: "#f0e1dc",
  },
  liftToggleButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#6b4a45",
  },
  liftToggleButtonTextActive: {
    color: "#6b3f3a",
  },
  liftAssistGrid: {
    gap: 12,
  },
  liftActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  liftActionButton: {
    flex: 1,
  },
  liftSummarySetCount: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#6a716b",
  },
  liftSummaryList: {
    gap: 8,
  },
  liftSummaryRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  liftSummaryLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#6b4a45",
  },
  liftSummaryValue: {
    fontSize: 15,
    lineHeight: 20,
    color: "#34423f",
  },
  dayPickerList: {
    gap: 12,
  },
  dayPickerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#fbf7ef",
    padding: 18,
    gap: 8,
  },
  dayPickerCardActive: {
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
  },
  dayPickerCardPressed: {
    backgroundColor: "#f0e1dc",
  },
  dayPickerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayPickerBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#ead9d3",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dayPickerBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "#6b3f3a",
  },
  dayPickerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#24313a",
  },
  dayPickerGoal: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    color: "#34423f",
  },
  dayPickerFocus: {
    fontSize: 14,
    lineHeight: 19,
    color: "#5c6862",
  },
  dayPickerExerciseLine: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b4a45",
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
    backgroundColor: "#f3ecdf",
  },
  detailTopBar: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#efe1dc",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  backButtonText: {
    fontSize: 28,
    lineHeight: 28,
    color: "#6b4a45",
    marginTop: -2,
  },
  detailTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#24313a",
  },
  detailSpacer: {
    width: 42,
  },
  detailContent: {
    padding: 20,
    gap: 16,
  },
  detailHero: {
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 20,
    gap: 8,
  },
  detailValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600",
    color: "#24313a",
  },
  detailDelta: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5c6862",
  },
  detailCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 20,
    gap: 10,
  },
  detailCardTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#24313a",
  },
  detailCardBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f5d57",
  },
  detailActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  detailActionButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#ead9d3",
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  detailActionButtonPressed: {
    backgroundColor: "#dec7bf",
  },
  detailActionButtonActive: {
    backgroundColor: "#d9c0b8",
    borderColor: "#b98d84",
  },
  detailActionButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#6b3f3a",
  },
  chartLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartLegendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  chartLegendSwatchDaily: {
    backgroundColor: "#8f4943",
  },
  chartLegendSwatchAverage: {
    backgroundColor: "#5d8455",
  },
  chartLegendText: {
    fontSize: 14,
    lineHeight: 18,
    color: "#4f5d57",
  },
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    padding: 14,
    gap: 12,
  },
  chartGrid: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    bottom: 54,
    justifyContent: "space-between",
    pointerEvents: "none",
  },
  chartAxisLabel: {
    alignSelf: "flex-end",
    fontSize: 12,
    lineHeight: 16,
    color: "#7a7a72",
  },
  chartPlot: {
    alignSelf: "center",
    position: "relative",
    marginTop: 8,
  },
  chartGuideTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    borderColor: "#ddcfbb",
  },
  chartGuideMiddle: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -0.5,
    borderTopWidth: 1,
    borderColor: "#e4d8c7",
  },
  chartGuideBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderColor: "#ddcfbb",
  },
  chartLineSegment: {
    position: "absolute",
    height: 2,
    borderRadius: 999,
  },
  chartPoint: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "#fff7f3",
  },
  chartLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  chartBottomLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#6a716b",
    textAlign: "center",
  },
  weightChartModeRow: {
    flexDirection: "row",
    gap: 10,
  },
  weightChartModeButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  weightChartModeButtonActive: {
    backgroundColor: "#ead9d3",
    borderColor: "#cfb2aa",
  },
  weightChartModeButtonPressed: {
    backgroundColor: "#f0e1dc",
  },
  weightChartModeButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#4f5d57",
  },
  weightChartModeButtonTextActive: {
    color: "#6b3f3a",
  },
  dateChipRow: {
    gap: 10,
    paddingRight: 4,
  },
  dateChip: {
    minWidth: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  dateChipActive: {
    backgroundColor: "#ead9d3",
    borderColor: "#cfb2aa",
  },
  dateChipPressed: {
    backgroundColor: "#f0e1dc",
  },
  dateChipLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#4f5d57",
  },
  dateChipLabelActive: {
    color: "#6b3f3a",
  },
  metricPreviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  metricPreviewDate: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6a716b",
  },
  metricPreviewValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    color: "#24313a",
  },
  metricPreviewEmpty: {
    fontSize: 16,
    lineHeight: 22,
    color: "#5c6862",
  },
  inlineActionButton: {
    borderRadius: 18,
    backgroundColor: "#8f4943",
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  inlineActionButtonDisabled: {
    backgroundColor: "#c5b0aa",
  },
  inlineActionButtonPressed: {
    backgroundColor: "#7d3f3a",
  },
  inlineActionButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#fff7f3",
  },
  historyList: {
    gap: 10,
  },
  historyTimeframeRow: {
    flexDirection: "row",
    gap: 10,
  },
  historyTimeframeButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  historyTimeframeButtonActive: {
    backgroundColor: "#ead9d3",
    borderColor: "#cfb2aa",
  },
  historyTimeframeButtonPressed: {
    backgroundColor: "#f0e1dc",
  },
  historyTimeframeButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#4f5d57",
  },
  historyTimeframeButtonTextActive: {
    color: "#6b3f3a",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#fbf7ef",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  historyRowPressed: {
    backgroundColor: "#f4ebde",
  },
  historyRowCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  historyRowMeta: {
    minWidth: 96,
    alignItems: "flex-end",
    gap: 4,
  },
  historyRowDate: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: "#34423f",
  },
  historyRowHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6a716b",
  },
  historyRowValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: "#24313a",
  },
  historyRowChange: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#5d8455",
  },
  historyRowChangeDown: {
    color: "#8f4943",
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: "#f3ecdf",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  menuSheet: {
    flex: 1,
    justifyContent: "space-between",
  },
  menuHeader: {
    gap: 6,
    marginBottom: 28,
  },
  menuTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#24313a",
  },
  menuCaption: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5f6a64",
  },
  menuList: {
    flex: 1,
    gap: 10,
  },
  menuRow: {
    backgroundColor: "#fbf7ef",
    borderWidth: 1,
    borderColor: "#d8ccb6",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  menuRowPressed: {
    backgroundColor: "#f0e6d6",
  },
  menuRowActive: {
    backgroundColor: "#e8dcc4",
  },
  menuRowText: {
    fontSize: 22,
    lineHeight: 28,
    color: "#34423f",
    fontWeight: "500",
    textAlign: "center",
  },
  menuRowTextActive: {
    color: "#24313a",
    fontWeight: "700",
  },
  closeButton: {
    alignSelf: "center",
    minWidth: 120,
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ccbfa8",
    backgroundColor: "#fbf7ef",
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeButtonPressed: {
    backgroundColor: "#f0e6d6",
  },
  closeButtonText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "600",
    color: "#24313a",
  },
  errorPopupWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(36, 49, 58, 0.12)",
  },
  errorPopup: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 20,
    gap: 12,
  },
  errorPopupTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#8f4943",
  },
  errorPopupBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f5d57",
  },
  errorPopupButton: {
    alignSelf: "flex-end",
    borderRadius: 16,
    backgroundColor: "#ead9d3",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorPopupButtonPressed: {
    backgroundColor: "#dec7bf",
  },
  errorPopupButtonText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    color: "#6b3f3a",
  },
});
