import { Pressable, Text, View } from "react-native";
import { HealthLiftExerciseEntry } from "./HealthLiftExerciseEntry";
import type {
  LiftCompletedExercise,
  LiftExerciseDraft,
  LiftSession,
  LiftSetDraft,
} from "../types";

type HealthLiftWorkoutFlowProps = {
  styles: any;
  activeLiftSession: LiftSession;
  completedLiftExercises: LiftCompletedExercise[];
  exerciseDraft: LiftExerciseDraft;
  exerciseSuggestions: string[];
  onChangeExerciseQuery: (value: string) => void;
  onSelectExercise: (value: string) => void;
  onOpenCustomExercise: () => void;
  onChangeCustomExercise: (value: string) => void;
  onSaveCustomExercise: () => void;
  onEditExercise: () => void;
  onJumpToSet: (index: number) => void;
  currentSet: LiftSetDraft;
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

export function HealthLiftWorkoutFlow({
  styles,
  activeLiftSession,
  completedLiftExercises,
  exerciseDraft,
  exerciseSuggestions,
  onChangeExerciseQuery,
  onSelectExercise,
  onOpenCustomExercise,
  onChangeCustomExercise,
  onSaveCustomExercise,
  onEditExercise,
  onJumpToSet,
  currentSet,
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
}: HealthLiftWorkoutFlowProps) {
  return (
    <>
      {completedLiftExercises.map((exercise, index) => (
        <View key={`${exercise.exerciseName}-${index}`} style={styles.detailCard}>
          <View style={styles.liftSetHeaderRow}>
            <Text style={styles.detailCardTitle}>{exercise.exerciseName}</Text>
            <Text style={styles.liftSummarySetCount}>{exercise.setCount} sets</Text>
          </View>
          <View style={styles.liftSummaryList}>
            {exercise.sets.map((set, setIndex) => (
              <View key={`${exercise.exerciseName}-set-${setIndex}`} style={styles.liftSummaryRow}>
                <Text style={styles.liftSummaryLabel}>Set {setIndex + 1}</Text>
                <Text style={styles.liftSummaryValue}>
                  {set.reps} reps
                  {set.negativeReps ? `, ${set.negativeReps} negative` : ""}
                  {set.assistedReps ? `, ${set.assistedReps} assisted` : ""}
                  {set.dropset ? ", dropset" : ""}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <HealthLiftExerciseEntry
        activeLiftSession={activeLiftSession}
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
        onIncreaseAssistedReps={onIncreaseAssistedReps}
        onIncreaseNegativeReps={onIncreaseNegativeReps}
        onIncreaseReps={onIncreaseReps}
        onJumpToSet={onJumpToSet}
        onOpenCustomExercise={onOpenCustomExercise}
        onSaveCustomExercise={onSaveCustomExercise}
        onSelectExercise={onSelectExercise}
        onToggleDropset={onToggleDropset}
        styles={styles}
      />

      {!exerciseDraft.isEditingExercise && exerciseDraft.selectedExercise ? (
        <View style={styles.liftActionRow}>
          <Pressable
            onPress={onNextSet}
            style={({ pressed }) => [
              styles.inlineActionButton,
              styles.liftActionButton,
              pressed && styles.inlineActionButtonPressed,
            ]}
          >
            <Text style={styles.inlineActionButtonText}>Next set</Text>
          </Pressable>
          <Pressable
            onPress={onNextExercise}
            style={({ pressed }) => [
              styles.inlineActionButton,
              styles.liftActionButton,
              pressed && styles.inlineActionButtonPressed,
            ]}
          >
            <Text style={styles.inlineActionButtonText}>Next exercise</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}
