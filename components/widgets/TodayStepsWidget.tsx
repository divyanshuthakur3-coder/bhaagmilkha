import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface TodayStepsWidgetProps {
    steps: number;
    goal: number;
}

export function TodayStepsWidget({ steps, goal }: TodayStepsWidgetProps) {
    const progress = Math.min(1, steps / goal);
    const progressWidth = `${Math.round(progress * 100)}%`;

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
            <TextWidget
                text="STEPS TODAY"
                style={{
                    color: '#94A3B8',
                    fontSize: 10,
                    fontWeight: 'bold',
                    marginBottom: 8,
                }}
            />

            <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
                <TextWidget
                    text={steps.toLocaleString()}
                    style={{
                        color: '#10B981',
                        fontSize: 24,
                        fontWeight: 'bold',
                    }}
                />
                <TextWidget
                    text={` / ${goal.toLocaleString()}`}
                    style={{
                        color: '#64748B',
                        fontSize: 12,
                    }}
                />
            </FlexWidget>

            {/* Progress Bar Container */}
            <FlexWidget
                style={{
                    height: 8,
                    width: 'match_parent',
                    backgroundColor: '#1E293B',
                    borderRadius: 4,
                    overflow: 'hidden',
                }}
            >
                {/* Progress Fill */}
                <FlexWidget
                    style={{
                        height: 'match_parent',
                        width: progressWidth as any,
                        backgroundColor: '#10B981',
                    }}
                />
            </FlexWidget>

            <TextWidget
                text={`${Math.round(progress * 100)}% of goal`}
                style={{
                    color: '#64748B',
                    fontSize: 10,
                    marginTop: 4,
                }}
            />
        </FlexWidget>
    );
}
