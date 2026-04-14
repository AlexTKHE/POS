import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { signInHealthUser, signUpHealthUser } from "../../health/data/health";

export function AuthScreen() {
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function submitAuth() {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Enter both email and password.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      if (authMode === "sign_in") {
        await signInHealthUser(authEmail.trim(), authPassword);
      } else {
        await signUpHealthUser(authEmail.trim(), authPassword);
      }

      router.replace("/");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign in to Health Hub</Text>
        <Text style={styles.body}>
          Health data is account-based now, so every page routes through this sign-in
          screen until a session exists.
        </Text>

        <View style={styles.authModeRow}>
          <Pressable
            onPress={() => setAuthMode("sign_in")}
            style={[
              styles.authModeButton,
              authMode === "sign_in" && styles.authModeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.authModeText,
                authMode === "sign_in" && styles.authModeTextActive,
              ]}
            >
              Sign in
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAuthMode("sign_up")}
            style={[
              styles.authModeButton,
              authMode === "sign_up" && styles.authModeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.authModeText,
                authMode === "sign_up" && styles.authModeTextActive,
              ]}
            >
              Create account
            </Text>
          </Pressable>
        </View>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setAuthEmail}
          placeholder="Email"
          placeholderTextColor="#8d8a81"
          style={styles.input}
          value={authEmail}
        />

        <TextInput
          autoCapitalize="none"
          onChangeText={setAuthPassword}
          placeholder="Password"
          placeholderTextColor="#8d8a81"
          secureTextEntry
          style={styles.input}
          value={authPassword}
        />

        {authError ? <Text style={styles.error}>{authError}</Text> : null}

        <Pressable
          disabled={isSubmittingAuth}
          onPress={() => void submitAuth()}
          style={({ pressed }) => [
            styles.submitButton,
            isSubmittingAuth && styles.submitButtonDisabled,
            pressed && !isSubmittingAuth && styles.submitButtonPressed,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmittingAuth
              ? "Working..."
              : authMode === "sign_in"
                ? "Sign in"
                : "Create account"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3ecdf",
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fbf7ef",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#24313a",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f5d57",
  },
  authModeRow: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    overflow: "hidden",
  },
  authModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f7eee9",
  },
  authModeButtonActive: {
    backgroundColor: "#ead9d3",
  },
  authModeText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#34423f",
  },
  authModeTextActive: {
    color: "#6b3f3a",
  },
  input: {
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
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8f4943",
  },
  submitButton: {
    borderRadius: 20,
    backgroundColor: "#8f4943",
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#c5b0aa",
  },
  submitButtonPressed: {
    backgroundColor: "#7d3f3a",
  },
  submitButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#fff7f3",
  },
});
