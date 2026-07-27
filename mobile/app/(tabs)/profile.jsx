import { Ionicons } from "@expo/vector-icons";
import { useClerk, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { profileStyles } from "../../assets/styles/profile.styles";
import LoadingSpinner from "../../components/LoadingSpinner";
import { AnimatedProgressBar, FadeInView, ScalePressable } from "../../components/Motion";
import ScreenHeader from "../../components/ScreenHeader";
import { COLORS } from "../../constants/colors";
import { FavoritesService } from "../../services/favoritesService";
import { RecipeStore } from "../../services/recipeStore";

const PREFERENCE_GROUPS = [
  { key: "diet", label: "Diet preference", options: ["No preference", "Vegetarian", "Vegan"] },
  {
    key: "cookingLevel",
    label: "Cooking experience",
    options: ["Beginner", "Intermediate", "Advanced"],
  },
  {
    key: "maxCookingTime",
    label: "Preferred cooking time",
    options: ["20 minutes", "30 minutes", "60 minutes"],
  },
];

const JOURNEY_TARGETS = { cooked: 10, streak: 7, favorites: 10 };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "preferences", label: "Preferences" },
  { key: "journey", label: "Journey" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState("overview");
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState({
    diet: "No preference",
    cookingLevel: "Beginner",
    maxCookingTime: "30 minutes",
  });
  const [stats, setStats] = useState({ cookedCount: 0, streak: 0 });
  const [favoriteCount, setFavoriteCount] = useState(0);

  // Wait for Clerk to finish hydrating before reading any per-user local
  // storage. Reading earlier would use a temporary "guest" key, which then
  // gets replaced by the real user's data a moment later - the flicker
  // that showed up as a "loading issue" on the profile screen.
  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return undefined;
      let active = true;

      Promise.all([
        RecipeStore.getPreferences(userId),
        RecipeStore.getCookingStats(userId),
        FavoritesService.getLocal(userId),
      ]).then(([savedPreferences, savedStats, favorites]) => {
        if (!active) return;
        setPreferences(savedPreferences);
        setStats(savedStats);
        setFavoriteCount(favorites.length);
        setReady(true);
      });

      return () => {
        active = false;
      };
    }, [isLoaded, userId]),
  );

  const updatePreference = async (key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);

    try {
      await RecipeStore.setPreferences(userId, next);
    } catch {
      Alert.alert("Couldn’t save preference", "Please try again.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  if (!ready) {
    return <LoadingSpinner message="Loading your profile…" />;
  }

  const displayName = user?.fullName || user?.firstName || "RecipeNest Cook";
  const email = user?.primaryEmailAddress?.emailAddress || "Signed-in account";

  const journeyGoals = [
    {
      key: "cooked",
      icon: "restaurant-outline",
      title: "Recipes cooked",
      description: "Complete recipes using guided cooking mode.",
      current: stats.cookedCount,
      goal: JOURNEY_TARGETS.cooked,
    },
    {
      key: "streak",
      icon: "flame-outline",
      title: "Cooking streak",
      description: "Keep returning and cooking on consecutive days.",
      current: stats.streak,
      goal: JOURNEY_TARGETS.streak,
    },
    {
      key: "favorites",
      icon: "heart-outline",
      title: "Saved collection",
      description: "Build a personal collection of recipes you enjoy.",
      current: favoriteCount,
      goal: JOURNEY_TARGETS.favorites,
    },
  ];

  const overallProgress =
    journeyGoals.reduce(
      (total, item) => total + Math.min(Math.max(Number(item.current) || 0, 0) / item.goal, 1),
      0,
    ) / journeyGoals.length;
  const overallPercent = Math.round(overallProgress * 100);
  const nextGoal = journeyGoals.find((item) => (Number(item.current) || 0) < item.goal);
  const nextGoalText = nextGoal
    ? `${Math.max(nextGoal.goal - (Number(nextGoal.current) || 0), 0)} more to complete ${nextGoal.title.toLowerCase()}.`
    : "You completed every starter journey goal. Keep exploring new recipes.";

  return (
    <ScrollView
      style={profileStyles.container}
      contentContainerStyle={profileStyles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="ACCOUNT"
        icon="person"
        title="Profile"
        subtitle="Manage your identity, preferences, and cooking progress."
        actionIcon="log-out-outline"
        actionLabel="Sign out"
        onAction={handleSignOut}
        style={profileStyles.headerFlush}
      />

      <FadeInView delay={40} translateY={10}>
        <View style={profileStyles.identityCard}>
          <View style={profileStyles.identityAvatarWrap}>
            <Image
              source={user?.imageUrl ? { uri: user.imageUrl } : require("../../assets/images/icon.png")}
              style={profileStyles.identityAvatar}
              contentFit="cover"
              transition={200}
            />
          </View>
          <View style={profileStyles.identityCopy}>
            <Text style={profileStyles.identityName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={profileStyles.identityEmail} numberOfLines={1}>
              {email}
            </Text>
            <View style={profileStyles.identityBadge}>
              <Ionicons name="restaurant-outline" size={11} color={COLORS.primary} />
              <Text style={profileStyles.identityBadgeText}>{preferences.cookingLevel} home cook</Text>
            </View>
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={90} translateY={10}>
        <View style={profileStyles.segmentRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <ScalePressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[profileStyles.segmentItem, active && profileStyles.segmentItemActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[profileStyles.segmentText, active && profileStyles.segmentTextActive]}>
                  {tab.label}
                </Text>
              </ScalePressable>
            );
          })}
        </View>
      </FadeInView>

      {activeTab === "overview" ? (
        <View style={profileStyles.section}>
          <FadeInView delay={40} translateY={10}>
            <View style={profileStyles.statsCard}>
              <ProfileStat icon="checkmark-circle-outline" value={stats.cookedCount} label="Cooked" />
              <View style={profileStyles.statDivider} />
              <ProfileStat icon="flame-outline" value={stats.streak} label="Day streak" />
              <View style={profileStyles.statDivider} />
              <ProfileStat icon="heart-outline" value={favoriteCount} label="Favorites" />
            </View>
          </FadeInView>

          <FadeInView delay={90} translateY={10}>
            <FactRow
              icon="leaf-outline"
              label="Diet preference"
              value={preferences.diet}
              onPress={() => setActiveTab("preferences")}
            />
          </FadeInView>
          <FadeInView delay={130} translateY={10}>
            <FactRow
              icon="timer-outline"
              label="Preferred cooking time"
              value={preferences.maxCookingTime}
              onPress={() => setActiveTab("preferences")}
            />
          </FadeInView>

          <FadeInView delay={170} translateY={10}>
            <View style={profileStyles.accountCard}>
              <View style={profileStyles.accountCopy}>
                <Text style={profileStyles.accountTitle}>Account</Text>
                <Text style={profileStyles.accountText}>Sign out from RecipeNest on this device.</Text>
              </View>
              <ScalePressable style={profileStyles.logoutButton} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
                <Text style={profileStyles.logoutText}>Sign out</Text>
              </ScalePressable>
            </View>
          </FadeInView>
        </View>
      ) : null}

      {activeTab === "preferences" ? (
        <View style={profileStyles.section}>
          <FadeInView delay={20}>
            <View style={profileStyles.sectionHeader}>
              <Text style={profileStyles.sectionTitle}>Preferences</Text>
              <Text style={profileStyles.sectionHint}>Saved automatically</Text>
            </View>
          </FadeInView>

          {PREFERENCE_GROUPS.map((group, groupIndex) => (
            <FadeInView key={group.key} delay={50 + groupIndex * 45} translateY={10}>
              <View style={profileStyles.optionGroup}>
                <Text style={profileStyles.optionLabel}>{group.label}</Text>
                <View style={profileStyles.optionRow}>
                  {group.options.map((option) => {
                    const active = preferences[group.key] === option;
                    return (
                      <ScalePressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        key={option}
                        style={[profileStyles.option, active && profileStyles.optionActive]}
                        onPress={() => updatePreference(group.key, option)}
                      >
                        {active ? (
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                        ) : null}
                        <Text style={[profileStyles.optionText, active && profileStyles.optionTextActive]}>
                          {option}
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </View>
              </View>
            </FadeInView>
          ))}
        </View>
      ) : null}

      {activeTab === "journey" ? (
        <View style={profileStyles.section}>
          <FadeInView delay={20}>
            <View style={profileStyles.sectionHeader}>
              <Text style={profileStyles.sectionTitle}>Cooking journey</Text>
              <Text style={profileStyles.sectionHint}>Based on your activity</Text>
            </View>
          </FadeInView>

          <FadeInView delay={50} translateY={8}>
            <View style={profileStyles.progressOverview}>
              <View style={profileStyles.progressOverviewTop}>
                <View style={profileStyles.progressOverviewIcon}>
                  <Ionicons name="analytics-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={profileStyles.progressOverviewCopy}>
                  <Text style={profileStyles.progressTitle}>Overall progress</Text>
                  <Text style={profileStyles.nextGoalText} numberOfLines={2}>
                    {nextGoalText}
                  </Text>
                </View>
                <Text style={profileStyles.progressPercent}>{overallPercent}%</Text>
              </View>

              <AnimatedProgressBar
                progress={overallProgress}
                trackStyle={profileStyles.overallProgressTrack}
                fillStyle={profileStyles.overallProgressFill}
              />
            </View>
          </FadeInView>

          {journeyGoals.map(({ key, ...goal }, index) => (
            <FadeInView key={key} delay={90 + index * 55} translateY={10}>
              <JourneyGoal {...goal} />
            </FadeInView>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ProfileStat({ icon, value, label }) {
  return (
    <View style={profileStyles.statCell}>
      <Ionicons name={icon} size={17} color={COLORS.primary} />
      <Text style={profileStyles.statValue}>{value}</Text>
      <Text style={profileStyles.statLabel}>{label}</Text>
    </View>
  );
}

function FactRow({ icon, label, value, onPress }) {
  return (
    <ScalePressable accessibilityRole="button" style={profileStyles.factRow} onPress={onPress}>
      <View style={profileStyles.factIcon}>
        <Ionicons name={icon} size={17} color={COLORS.primary} />
      </View>
      <View style={profileStyles.factCopy}>
        <Text style={profileStyles.factLabel}>{label}</Text>
        <Text style={profileStyles.factValue}>{value}</Text>
      </View>
      <Text style={profileStyles.factLink}>Edit</Text>
    </ScalePressable>
  );
}

function JourneyGoal({ icon, title, description, current, goal }) {
  const safeCurrent = Math.max(0, Number(current) || 0);
  const progress = Math.min(safeCurrent / goal, 1);
  const complete = progress >= 1;

  return (
    <View style={[profileStyles.journeyCard, complete && profileStyles.journeyCardComplete]}>
      <View style={[profileStyles.journeyIcon, complete && profileStyles.journeyIconComplete]}>
        <Ionicons
          name={complete ? "checkmark" : icon}
          size={20}
          color={complete ? COLORS.white : COLORS.primary}
        />
      </View>

      <View style={profileStyles.journeyCopy}>
        <View style={profileStyles.journeyTitleRow}>
          <Text style={profileStyles.journeyTitle}>{title}</Text>
          <Text style={[profileStyles.journeyValue, complete && profileStyles.journeyValueComplete]}>
            {Math.min(safeCurrent, goal)}/{goal}
          </Text>
        </View>
        <Text style={profileStyles.journeyDescription}>{description}</Text>
        <AnimatedProgressBar
          progress={progress}
          trackStyle={profileStyles.journeyProgressTrack}
          fillStyle={[
            profileStyles.journeyProgressFill,
            complete && profileStyles.journeyProgressFillComplete,
          ]}
        />
      </View>
    </View>
  );
}
