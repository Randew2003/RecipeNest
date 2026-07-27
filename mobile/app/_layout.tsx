import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";
import { COLORS } from "../constants/colors";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

function ConfigurationError() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        backgroundColor: COLORS.background,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.text, textAlign: "center" }}>
        App setup required
      </Text>
      <Text
        style={{
          marginTop: 12,
          color: COLORS.textLight,
          fontSize: 15,
          lineHeight: 22,
          textAlign: "center",
        }}
      >
        Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to mobile/.env, then restart Expo with the
        cache cleared.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {publishableKey ? (
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <SafeScreen>
            <Slot />
          </SafeScreen>
        </ClerkProvider>
      ) : (
        <ConfigurationError />
      )}
    </SafeAreaProvider>
  );
}
