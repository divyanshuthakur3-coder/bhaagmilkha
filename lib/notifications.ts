import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3B82F6',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // Return if not granted
        if (finalStatus !== 'granted') {
            return null;
        }

        token = (await Notifications.getExpoPushTokenAsync({
            projectId: "your-project-id", // Add project ID later if using Expo Push Services
        })).data;
    }

    return token;
}

// Function to schedule a local reminder
export async function scheduleRunReminder(title: string, body: string, triggerHours: number) {
    if (!Device.isDevice) return;

    // First, clear existing notifications so we don't spam
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
        },
        trigger: {
            // @ts-ignore
            seconds: triggerHours * 3600,
            channelId: 'default',
        },
    });
}
