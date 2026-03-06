import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { FontSize, Spacing } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

function TabIcon({ icon, label, focused }: { icon: keyof typeof Ionicons.glyphMap; label: string; focused: boolean }) {
    const { colors: Colors } = useTheme();
    return (
        <View style={styles.tabItem}>
            <View style={[styles.iconContainer, focused && { backgroundColor: Colors.accentGlow }]}>
                <Ionicons
                    name={focused ? icon : `${icon}-outline` as any}
                    size={20}
                    color={focused ? Colors.accent : Colors.textMuted}
                />
            </View>
            <Text style={[styles.tabLabel, { color: focused ? Colors.accent : Colors.textMuted, fontWeight: focused ? '700' : '500' }]}>{label}</Text>
        </View>
    );
}

export default function TabLayout() {
    const { colors: Colors } = useTheme();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        backgroundColor: Colors.surface,
                        borderTopColor: Colors.border,
                        borderTopWidth: 1,
                        shadowColor: Colors.accent,
                    }
                ],
                tabBarShowLabel: false,
                tabBarActiveTintColor: Colors.accent,
                tabBarInactiveTintColor: Colors.textMuted,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="home" label="Home" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="calendar" label="History" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="goals"
                options={{
                    title: 'Goals',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="trophy" label="Goals" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    title: 'Analytics',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="stats-chart" label="Stats" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="person" label="Profile" focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingTop: 6,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        elevation: 0,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    iconContainer: {
        width: 36,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIcon: {
        fontSize: 18,
        opacity: 0.5,
    },
    tabIconActive: {
        opacity: 1,
        fontSize: 20,
    },
    tabLabel: {
        fontSize: FontSize.xs,
        fontWeight: '500',
    },
});
