import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";

function TabIcon({ focused, color, active, inactive }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      speed: 24,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={focused ? active : inactive} size={22} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: COLORS.background },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 58 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          backgroundColor: COLORS.card,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          elevation: 8,
        },
        tabBarLabelStyle: {
          marginTop: 2,
          fontSize: 10,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Recipes",
          tabBarIcon: (props) => (
            <TabIcon {...props} active="restaurant" inactive="restaurant-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarIcon: (props) => <TabIcon {...props} active="basket" inactive="basket-outline" />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Plan",
          tabBarIcon: (props) => (
            <TabIcon {...props} active="calendar" inactive="calendar-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Saved",
          tabBarIcon: (props) => <TabIcon {...props} active="heart" inactive="heart-outline" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: (props) => <TabIcon {...props} active="person" inactive="person-outline" />,
        }}
      />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
