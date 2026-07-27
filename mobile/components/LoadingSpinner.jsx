import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/colors";

export default function LoadingSpinner({ message = "Loading…", size = "large", compact = false }) {
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <ActivityIndicator size={size} color={COLORS.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: COLORS.background,
  },
  compactContainer: {
    flex: 0,
    paddingVertical: 28,
    backgroundColor: "transparent",
  },
  message: {
    marginTop: 14,
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
