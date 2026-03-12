import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';

interface LastRunWidgetProps {
    distance: string;
    pace: string;
    duration: string;
    date: string;
}

export function LastRunWidget({ distance, pace, duration, date }: LastRunWidgetProps) {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#0F0F0F',
                borderRadius: 16,
                padding: 12,
                flexDirection: 'column',
            }}
        >
            <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <TextWidget
                    text="LAST RUN"
                    style={{
                        color: '#94A3B8',
                        fontSize: 10,
                        fontWeight: 'bold',
                    }}
                />
                <TextWidget
                    text={date}
                    style={{
                        color: '#64748B',
                        fontSize: 10,
                    }}
                />
            </FlexWidget>

            <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
                <TextWidget
                    text={distance}
                    style={{
                        color: '#FFFFFF',
                        fontSize: 24,
                        fontWeight: 'bold',
                    }}
                />
                <TextWidget
                    text=" km"
                    style={{
                        color: '#94A3B8',
                        fontSize: 12,
                    }}
                />
            </FlexWidget>

            <FlexWidget style={{ flexDirection: 'row' }}>
                <FlexWidget style={{ flexDirection: 'column' }}>
                    <TextWidget text={pace} style={{ color: '#3B82F6', fontSize: 12, fontWeight: 'bold' }} />
                    <TextWidget text="min/km" style={{ color: '#64748B', fontSize: 8 }} />
                </FlexWidget>
                <FlexWidget style={{ flexDirection: 'column' }}>
                    <TextWidget text={duration} style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }} />
                    <TextWidget text="time" style={{ color: '#64748B', fontSize: 8 }} />
                </FlexWidget>
            </FlexWidget>
        </FlexWidget>
    );
}
