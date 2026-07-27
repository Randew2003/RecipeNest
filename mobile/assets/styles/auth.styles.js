import { Dimensions, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

const { height } = Dimensions.get("window");

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: COLORS.primary,
  },
  brandText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  imageContainer: {
    height: Math.min(height * 0.28, 240),
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  image: {
    width: 270,
    height: 245,
  },
  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 28,
    paddingHorizontal: 8,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textLight,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  inputContainer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    minHeight: 54,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  codeInput: {
    letterSpacing: 3,
    fontWeight: "700",
  },
  eyeButton: {
    padding: 8,
    marginRight: -8,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 4,
    color: COLORS.textLight,
    fontSize: 12,
  },
  authButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    marginRight: 8,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
  },
  linkContainer: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
  },
  link: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  secondaryLink: {
    alignSelf: "center",
    paddingTop: 20,
    paddingHorizontal: 12,
  },
});
