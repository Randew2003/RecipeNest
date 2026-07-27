import { Ionicons } from "@expo/vector-icons";
import { useSignUp } from "@clerk/expo/legacy";
import { Image } from "expo-image";
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
import { authStyles } from "../assets/styles/auth.styles";
import { COLORS } from "../constants/colors";
import { getClerkErrorMessage } from "../utils/clerk";

export default function VerifyEmail({ email, onBack }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerification = async () => {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      Alert.alert("Code required", "Enter the verification code from your email.");
      return;
    }

    if (!isLoaded || loading) return;

    setLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: normalizedCode });

      if (attempt.status !== "complete" || !attempt.createdSessionId) {
        Alert.alert("Verification incomplete", "Please check the code and try again.");
        return;
      }

      await setActive({ session: attempt.createdSessionId });
    } catch (error) {
      Alert.alert(
        "Verification failed",
        getClerkErrorMessage(error, "The code may be incorrect or expired."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || resending) return;

    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      Alert.alert("Code sent", "A new verification code has been sent to your email.");
    } catch (error) {
      Alert.alert("Unable to resend", getClerkErrorMessage(error, "Please try again shortly."));
    } finally {
      setResending(false);
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
              <Ionicons name="mail" size={20} color={COLORS.white} />
            </View>
            <Text style={authStyles.brandText}>Email verification</Text>
          </View>

          <View style={authStyles.imageContainer}>
            <Image
              source={require("../assets/images/i3.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.title}>Check your inbox</Text>
          <Text style={authStyles.subtitle}>
            Enter the verification code sent to {email || "your email address"}.
          </Text>

          <View style={authStyles.formContainer}>
            <Text style={authStyles.inputLabel}>Verification code</Text>
            <View style={authStyles.inputContainer}>
              <Ionicons name="keypad-outline" size={19} color={COLORS.textLight} />
              <TextInput
                style={[authStyles.textInput, authStyles.codeInput]}
                placeholder="Enter code"
                placeholderTextColor={COLORS.gray}
                value={code}
                onChangeText={(value) => setCode(value.replace(/\s/g, ""))}
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handleVerification}
              />
            </View>

            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleVerification}
              disabled={loading || !isLoaded}
              activeOpacity={0.85}
            >
              <Text style={authStyles.buttonText}>{loading ? "Verifying…" : "Verify email"}</Text>
              {!loading ? <Ionicons name="checkmark" size={20} color={COLORS.white} /> : null}
            </TouchableOpacity>

            <TouchableOpacity style={authStyles.secondaryLink} onPress={handleResend}>
              <Text style={authStyles.link}>{resending ? "Sending…" : "Resend code"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={authStyles.linkContainer} onPress={onBack}>
              <Text style={authStyles.linkText}>Use a different email address</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
