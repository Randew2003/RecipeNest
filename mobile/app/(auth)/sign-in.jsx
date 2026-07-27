import { Ionicons } from "@expo/vector-icons";
import { useSignIn } from "@clerk/expo/legacy";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authStyles } from "../../assets/styles/auth.styles";
import { COLORS } from "../../constants/colors";
import { getClerkErrorMessage } from "../../utils/clerk";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert("Missing details", "Enter your email address and password.");
      return;
    }

    if (!isLoaded || loading) return;

    setLoading(true);
    try {
      const attempt = await signIn.create({
        identifier: normalizedEmail,
        password,
      });

      if (attempt.status !== "complete" || !attempt.createdSessionId) {
        Alert.alert("Sign in incomplete", "Please complete the additional sign-in steps.");
        return;
      }

      await setActive({ session: attempt.createdSessionId });
      router.replace("/");
    } catch (error) {
      Alert.alert("Unable to sign in", getClerkErrorMessage(error, "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={authStyles.brandRow}>
            <View style={authStyles.brandIcon}>
              <Ionicons name="restaurant" size={20} color={COLORS.white} />
            </View>
            <Text style={authStyles.brandText}>RecipeNest</Text>
          </View>

          <View style={authStyles.imageContainer}>
            <Image
              source={require("../../assets/images/i1.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.title}>Welcome back</Text>
          <Text style={authStyles.subtitle}>Sign in to continue discovering and saving recipes.</Text>

          <View style={authStyles.formContainer}>
            <Text style={authStyles.inputLabel}>Email</Text>
            <View style={authStyles.inputContainer}>
              <Ionicons name="mail-outline" size={19} color={COLORS.textLight} />
              <TextInput
                style={authStyles.textInput}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.gray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
              />
            </View>

            <Text style={authStyles.inputLabel}>Password</Text>
            <View style={authStyles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={19} color={COLORS.textLight} />
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                style={authStyles.eyeButton}
                onPress={() => setShowPassword((current) => !current)}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading || !isLoaded}
              activeOpacity={0.85}
            >
              <Text style={authStyles.buttonText}>{loading ? "Signing in…" : "Sign in"}</Text>
              {!loading ? <Ionicons name="arrow-forward" size={19} color={COLORS.white} /> : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={authStyles.linkContainer}
              onPress={() => router.push("/(auth)/sign-up")}
            >
              <Text style={authStyles.linkText}>
                New to RecipeNest? <Text style={authStyles.link}>Create an account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
