import { StyleSheet, Text, View } from "react-native";

export function ProductivityHomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Personal Operating System</Text>
        <Text style={styles.title}>Productivity is the control center.</Text>
        <Text style={styles.body}>
          This first slice only establishes the app&apos;s structure so later
          screens can layer in naturally.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3ecdf",
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fbf7ef",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 24,
    gap: 12,
  },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#6b705c",
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "600",
    color: "#263238",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4d5b57",
  },
});
