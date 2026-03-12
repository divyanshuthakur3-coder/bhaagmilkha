import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://your-sentry-dsn.com", // User will need to update this with their real DSN
  tracesSampleRate: 1.0,
});

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

            {focused && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: -14, // Adjusted for new height
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: Colors.accent,
                    }}
                />
            )}
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
                        backgroundColor: Colors.surface, // Solid background based on theme
                        borderColor: Colors.border,
                        borderTopWidth: 1,
                    },
                ],
                tabBarItemStyle: styles.tabBarItem,
                tabBarActiveTintColor: Colors.accent,
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
                    listeners={{
                        tabPress: () => {
                            handleTabPress();
                        }
                    }}
                />
            ))}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 34 : 20, // Slightly more gap from bottom
        left: 20,
        right: 20,
        height: 84, // Increased height for better alignment
        borderRadius: 42,
        borderWidth: 1.5,
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        paddingBottom: 0,
    },

    tabBarItem: {
        height: 84,
    },

    tabItem: {
        alignItems: "center",
        justifyContent: "center",
        height: '100%',
        width: '100%',
    },

    iconContainer: {
        width: 48,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },

    tabLabel: {
        fontSize: 10,
        textAlign: "center",
        letterSpacing: 0.5,
    },
});
