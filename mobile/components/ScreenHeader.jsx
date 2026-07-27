import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { commonStyles } from "../assets/styles/common.styles";
import { COLORS } from "../constants/colors";
import { FadeInView, ScalePressable } from "./Motion";

export default function ScreenHeader({
  eyebrow = "RECIPENEST",
  icon,
  iconLabel,
  onIconPress,
  title,
  subtitle,
  actionIcon,
  actionLabel,
  onAction,
  style,
}) {
  return (
    <FadeInView style={[commonStyles.screenHeader, style]} delay={20} translateY={8}>
      <View style={commonStyles.screenHeaderRow}>
        {icon ? (
          onIconPress ? (
            <ScalePressable
              accessibilityRole="button"
              accessibilityLabel={iconLabel || title}
              style={commonStyles.screenHeaderIcon}
              onPress={onIconPress}
            >
              <Ionicons name={icon} size={20} color={COLORS.primary} />
            </ScalePressable>
          ) : (
            <View style={commonStyles.screenHeaderIcon}>
              <Ionicons name={icon} size={20} color={COLORS.primary} />
            </View>
          )
        ) : null}

        <View style={commonStyles.screenHeaderCopy}>
          {eyebrow ? <Text style={commonStyles.screenEyebrow}>{eyebrow}</Text> : null}
          <Text style={commonStyles.screenTitle} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
          {subtitle ? (
            <Text style={commonStyles.screenSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {actionIcon && onAction ? (
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel || title}
            style={commonStyles.headerAction}
            onPress={onAction}
          >
            <Ionicons name={actionIcon} size={20} color={COLORS.primary} />
          </ScalePressable>
        ) : null}
      </View>
    </FadeInView>
  );
}
