import { Text, View } from "react-native";

type HealthDietTabProps = {
  styles: any;
};

export function HealthDietTab({ styles }: HealthDietTabProps) {
  return (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>Diet tab</Text>
      <Text style={styles.placeholderBody}>
        This view will hold calorie, macro, and food logging once the overview
        layout is approved.
      </Text>
    </View>
  );
}
