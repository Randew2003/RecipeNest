import { Ionicons } from "@expo/vector-icons";
import { useSignUp } from "@clerk/expo/legacy";
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
import VerifyEmail from "../../components/VerifyEmail";

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSignUp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert("Missing details", "Enter your email address and a password.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters for your password.");
      return;
    }

    if (!isLoaded || loading) return;

    setLoading(true);
    try {
      await signUp.create({ emailAddress: normalizedEmail, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setEmail(normalizedEmail);
      setPendingVerification(true);
    } catch (error) {
      Alert.alert(
        "Unable to create account",
        getClerkErrorMessage(error, "Please check your details and try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return <VerifyEmail email={email} onBack={() => setPendingVerification(false)} />;
  }

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
              source={require("../../assets/images/i2.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.title}>Create your account</Text>
          <Text style={authStyles.subtitle}>Save your favorite meals and find them anytime.</Text>

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
              />
            </View>

            <Text style={authStyles.inputLabel}>Password</Text>
            <View style={authStyles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={19} color={COLORS.textLight} />
              <TextInput
                style={authStyles.textInput}
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
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

            <Text style={authStyles.helperText}>Use 8 or more characters.</Text>

            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading || !isLoaded}
              activeOpacity={0.85}
            >
              <Text style={authStyles.buttonText}>
                {loading ? "Creating account…" : "Create account"}
              </Text>
              {!loading ? <Ionicons name="arrow-forward" size={19} color={COLORS.white} /> : null}
            </TouchableOpacity>

            <TouchableOpacity style={authStyles.linkContainer} onPress={() => router.back()}>
              <Text style={authStyles.linkText}>
                Already registered? <Text style={authStyles.link}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
