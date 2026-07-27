import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ScrollView, Text, View } from "react-native";
import { homeStyles } from "../assets/styles/home.styles";
import { COLORS } from "../constants/colors";
import { ScalePressable } from "./Motion";

export default function CategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  return (
    <View style={homeStyles.categoryFilterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={homeStyles.categoryFilterScrollContent}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.name;

          return (
            <ScalePressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={category.id}
              style={[homeStyles.categoryButton, isSelected && homeStyles.selectedCategory]}
              onPress={() => onSelectCategory(category.name)}
            >
              <View>
                <Image
                  source={{ uri: category.image }}
                  style={homeStyles.categoryImage}
                  contentFit="cover"
                  transition={200}
                />
                {isSelected ? (
                  <View style={homeStyles.categorySelectedIcon}>
                    <Ionicons name="checkmark" size={11} color={COLORS.white} />
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[homeStyles.categoryText, isSelected && homeStyles.selectedCategoryText]}
              >
                {category.name}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
