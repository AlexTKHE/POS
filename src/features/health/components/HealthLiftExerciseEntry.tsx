import { Pressable, Text, TextInput, View } from "react-native";
import type { LiftExerciseDraft, LiftSession, LiftSetDraft } from "../types";

type HealthLiftExerciseEntryProps = {
  styles: any;
  activeLiftSession: LiftSession;
  exerciseDraft: LiftExerciseDraft;
  currentSet: LiftSetDraft;
  exerciseSuggestions: string[];
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
};

export function HealthLiftExerciseEntry({
  styles,
  activeLiftSession,
  exerciseDraft,
  currentSet,
  exerciseSuggestions,
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
}: HealthLiftExerciseEntryProps) {
  const isChoosingExercise =
    !exerciseDraft.selectedExercise || exerciseDraft.isEditingExercise;

  return (
    <View style={styles.detailCard}>
      {isChoosingExercise ? (
        <>
          <Text style={styles.detailCardTitle}>Exercise</Text>
          <TextInput
            onChangeText={onChangeExerciseQuery}
            placeholder="Search exercise"
            placeholderTextColor="#8d8a81"
            style={styles.logInput}
            value={exerciseDraft.exerciseQuery}
          />

          <View style={styles.liftPresetList}>
            {exerciseSuggestions.map((exercise) => (
              <Pressable
                key={exercise}
                onPress={() => onSelectExercise(exercise)}
                style={({ pressed }) => [
                  styles.liftPresetRow,
                  exerciseDraft.selectedExercise === exercise && styles.liftPresetRowActive,
                  pressed && styles.liftPresetRowPressed,
                ]}
              >
                <Text
                  style={[
                    styles.liftPresetText,
                    exerciseDraft.selectedExercise === exercise &&
                      styles.liftPresetTextActive,
                  ]}
                >
                  {exercise}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={onOpenCustomExercise}
              style={({ pressed }) => [
                styles.liftPresetRow,
                styles.liftPresetAddRow,
                exerciseDraft.isAddingExercise && styles.liftPresetRowActive,
                pressed && styles.liftPresetRowPressed,
              ]}
            >
              <Text style={styles.liftPresetAddText}>+</Text>
            </Pressable>
          </View>

          {exerciseDraft.isAddingExercise ? (
            <View style={styles.liftCustomComposer}>
              <TextInput
                onChangeText={onChangeCustomExercise}
                placeholder="Name your lift"
                placeholderTextColor="#8d8a81"
                style={styles.logInput}
                value={exerciseDraft.customExercise}
              />
              <Pressable
                disabled={!exerciseDraft.customExercise.trim()}
                onPress={onSaveCustomExercise}
                style={({ pressed }) => [
                  styles.liftCustomSaveButton,
                  !exerciseDraft.customExercise.trim() && styles.logSaveButtonDisabled,
                  pressed &&
                    exerciseDraft.customExercise.trim() &&
                    styles.liftCustomSaveButtonPressed,
                ]}
              >
                <Text style={styles.liftCustomSaveButtonText}>Add lift</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      {!isChoosingExercise && exerciseDraft.selectedExercise ? (
        <>
          <View style={styles.liftSetHeaderRow}>
            <Text style={styles.detailCardTitle}>
              Set {exerciseDraft.activeSetIndex + 1}
            </Text>
            <View style={styles.liftHeaderActions}>
              <Pressable
                onPress={onEditExercise}
                style={({ pressed }) => [
                  styles.liftEditButton,
                  pressed && styles.liftEditButtonPressed,
                ]}
              >
                <Text style={styles.liftEditButtonText}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.detailCardBody}>{exerciseDraft.selectedExercise}</Text>
          <Text style={styles.liftSessionNote}>{activeLiftSession.workoutType} session</Text>
          <View style={styles.liftSetTabs}>
            {exerciseDraft.sets.map((_, index) => (
              <Pressable
                key={`set-tab-${index}`}
                onPress={() => onJumpToSet(index)}
                style={({ pressed }) => [
                  styles.liftSetTab,
                  exerciseDraft.activeSetIndex === index && styles.liftSetTabActive,
                  pressed && styles.liftSetTabPressed,
                ]}
              >
                <Text
                  style={[
                    styles.liftSetTabText,
                    exerciseDraft.activeSetIndex === index && styles.liftSetTabTextActive,
                  ]}
                >
                  {index + 1}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.liftMetricCard}>
            <Text style={styles.logFieldLabel}>Reps</Text>
            <View style={styles.liftCounterRow}>
              <Pressable
                onPress={onDecreaseReps}
                style={({ pressed }) => [
                  styles.hydrationButton,
                  styles.liftCounterButton,
                  pressed && styles.hydrationButtonPressed,
                ]}
              >
                <Text style={styles.hydrationButtonText}>-</Text>
              </Pressable>

              <TextInput
                keyboardType="number-pad"
                onChangeText={onChangeRepsText}
                style={[styles.logInput, styles.liftCounterInput]}
                value={`${currentSet.reps}`}
              />

              <Pressable
                onPress={onIncreaseReps}
                style={({ pressed }) => [
                  styles.hydrationButton,
                  styles.liftCounterButton,
                  pressed && styles.hydrationButtonPressed,
                ]}
              >
                <Text style={styles.hydrationButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={onToggleDropset}
            style={({ pressed }) => [
              styles.liftToggleButton,
              currentSet.dropset && styles.liftToggleButtonActive,
              pressed && styles.liftToggleButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.liftToggleButtonText,
                currentSet.dropset && styles.liftToggleButtonTextActive,
              ]}
            >
              Dropset
            </Text>
          </Pressable>

          <View style={styles.liftAssistGrid}>
            <View style={styles.liftMetricCard}>
              <Text style={styles.logFieldLabel}>Negative reps</Text>
              <View style={styles.liftCounterRow}>
                <Pressable
                  onPress={onDecreaseNegativeReps}
                  style={({ pressed }) => [
                    styles.hydrationButton,
                    styles.liftCounterButton,
                    pressed && styles.hydrationButtonPressed,
                  ]}
                >
                  <Text style={styles.hydrationButtonText}>-</Text>
                </Pressable>
                <View style={[styles.hydrationCountPill, styles.liftCounterPill]}>
                  <Text style={styles.hydrationCountText}>{currentSet.negativeReps}</Text>
                </View>
                <Pressable
                  onPress={onIncreaseNegativeReps}
                  style={({ pressed }) => [
                    styles.hydrationButton,
                    styles.liftCounterButton,
                    pressed && styles.hydrationButtonPressed,
                  ]}
                >
                  <Text style={styles.hydrationButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.liftMetricCard}>
              <Text style={styles.logFieldLabel}>Assisted reps</Text>
              <View style={styles.liftCounterRow}>
                <Pressable
                  onPress={onDecreaseAssistedReps}
                  style={({ pressed }) => [
                    styles.hydrationButton,
                    styles.liftCounterButton,
                    pressed && styles.hydrationButtonPressed,
                  ]}
                >
                  <Text style={styles.hydrationButtonText}>-</Text>
                </Pressable>
                <View style={[styles.hydrationCountPill, styles.liftCounterPill]}>
                  <Text style={styles.hydrationCountText}>{currentSet.assistedReps}</Text>
                </View>
                <Pressable
                  onPress={onIncreaseAssistedReps}
                  style={({ pressed }) => [
                    styles.hydrationButton,
                    styles.liftCounterButton,
                    pressed && styles.hydrationButtonPressed,
                  ]}
                >
                  <Text style={styles.hydrationButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
