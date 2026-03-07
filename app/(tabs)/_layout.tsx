import React, { useRef, useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Spacing } from "@/constants/colors";

type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
    icon: IconName;
    label: string;
    focused: boolean;
}

function TabIcon({ icon, label, focused }: TabIconProps) {
    const { colors: Colors } = useTheme();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: focused ? 1.15 : 1,
            useNativeDriver: true,
            friction: 6,
            tension: 60,
        }).start();
    }, [focused]);

    const iconName = focused ? icon : (`${icon}-outline` as IconName);

    return (
        <View style={styles.tabItem}>
            <Animated.View
                style={[
                    styles.iconContainer,
                    focused && { backgroundColor: Colors.accentGlow },
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                <Ionicons
                    name={iconName}
                    size={22}
                    color={focused ? Colors.textPrimary : Colors.textMuted}
                />
            </Animated.View>

            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                    styles.tabLabel,
                    {
                        color: focused ? Colors.textPrimary : Colors.textMuted,
                        fontWeight: focused ? "800" : "600",
                    },
                ]}
            >
                {label}
            </Text>
        </View>
    );
}

export default function TabLayout() {
    const { colors: Colors } = useTheme();

    const handleTabPress = () =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tabs = [
        { name: "index", icon: "home", label: "Home" },
        { name: "history", icon: "calendar", label: "History" },
        { name: "goals", icon: "trophy", label: "Goals" },
        { name: "analytics", icon: "stats-chart", label: "Stats" },
        { name: "profile", icon: "person", label: "Profile" },
    ] as const;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        backgroundColor: "rgba(18, 18, 26, 0.85)",
                        borderColor: Colors.borderLight,
                    },
                ],
                tabBarItemStyle: styles.tabBarItem,
                tabBarActiveTintColor: Colors.textPrimary,
                tabBarInactiveTintColor: Colors.textMuted,
            }}
        >
            {tabs.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.label,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon icon={tab.icon} label={tab.label} focused={focused} />
                        ),
                    }}
                    listeners={{ tabPress: handleTabPress }}
                />
            ))}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 32 : 24,
        left: Spacing.xl,
        right: Spacing.xl,
        height: 72,
        borderRadius: 36,
        borderWidth: 1,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
    },

    tabBarItem: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        height: 72,
    },

    tabItem: {
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
    },

    iconContainer: {
        width: 44,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    tabLabel: {
        fontSize: 10,
        textAlign: "center",
    },
});
