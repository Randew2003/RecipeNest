import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const commonStyles = StyleSheet.create({
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  screenHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  screenHeaderIcon: {
    width: 44,
    height: 44,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  screenHeaderCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  screenEyebrow: {
    marginBottom: 2,
    color: COLORS.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.45,
  },
  screenSubtitle: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: 12.5,
    lineHeight: 17,
  },
  headerAction: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },
});
