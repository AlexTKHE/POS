import { Pressable, Text, View } from "react-native";
import { HealthLiftWorkoutFlow } from "./HealthLiftWorkoutFlow";
import type { LiftCompletedExercise, LiftExerciseDraft, LiftSession, LiftSetDraft } from "../types";

type HealthLiftTabProps = {
  styles: any;
  activeLiftSession: LiftSession | null;
  completedLiftExercises: LiftCompletedExercise[];
  exerciseSuggestions: string[];
  exerciseDraft: LiftExerciseDraft;
  currentSet: LiftSetDraft;
  onChangeExerciseQuery: (value: string) => void;
  onSelectExercise: (value: string) => void;
  onOpenCustomExercise: () => void;
  onChangeCustomExercise: (value: string) => void;
  onSaveCustomExercise: () => void;
  onEditExercise: () => void;
  onJumpToSet: (index: number) => void;
  onDecreaseReps: () => void;
  onIncreaseReps: () => void;
  onChangeRepsText: (value: string) => void;
  onToggleDropset: () => void;
  onDecreaseNegativeReps: () => void;
  onIncreaseNegativeReps: () => void;
  onDecreaseAssistedReps: () => void;
  onIncreaseAssistedReps: () => void;
  onNextSet: () => void;
  onNextExercise: () => void;
};

export function HealthLiftTab({
  styles,
  activeLiftSession,
  completedLiftExercises,
  exerciseSuggestions,
  exerciseDraft,
  currentSet,
  onChangeExerciseQuery,
  onSelectExercise,
  onOpenCustomExercise,
  onChangeCustomExercise,
  onSaveCustomExercise,
  onEditExercise,
  onJumpToSet,
  onDecreaseReps,
  onIncreaseReps,
  onChangeRepsText,
  onToggleDropset,
  onDecreaseNegativeReps,
  onIncreaseNegativeReps,
  onDecreaseAssistedReps,
  onIncreaseAssistedReps,
  onNextSet,
  onNextExercise,
}: HealthLiftTabProps) {
  return (
    <>
      {!activeLiftSession ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Lift</Text>
          <Text style={styles.placeholderBody}>
            Start a lift to choose an exercise and begin logging sets. This intro
            should only appear while the tab has no active lift work in it.
          </Text>
        </View>
      ) : null}

      {activeLiftSession ? (
        <HealthLiftWorkoutFlow
          activeLiftSession={activeLiftSession}
          completedLiftExercises={completedLiftExercises}
          currentSet={currentSet}
          exerciseDraft={exerciseDraft}
          exerciseSuggestions={exerciseSuggestions}
          onChangeCustomExercise={onChangeCustomExercise}
          onChangeExerciseQuery={onChangeExerciseQuery}
          onChangeRepsText={onChangeRepsText}
          onDecreaseAssistedReps={onDecreaseAssistedReps}
          onDecreaseNegativeReps={onDecreaseNegativeReps}
          onDecreaseReps={onDecreaseReps}
          onEditExercise={onEditExercise}
          onJumpToSet={onJumpToSet}
          onIncreaseAssistedReps={onIncreaseAssistedReps}
          onIncreaseNegativeReps={onIncreaseNegativeReps}
          onIncreaseReps={onIncreaseReps}
          onNextExercise={onNextExercise}
          onNextSet={onNextSet}
          onOpenCustomExercise={onOpenCustomExercise}
          onSaveCustomExercise={onSaveCustomExercise}
          onSelectExercise={onSelectExercise}
          onToggleDropset={onToggleDropset}
          styles={styles}
        />
      ) : null}
    </>
  );
}
