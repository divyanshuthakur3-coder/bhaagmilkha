import React from 'react';
import { registerWidgetTaskHandler, requestWidgetUpdate } from 'react-native-android-widget';
import { LastRunWidget } from '../components/widgets/LastRunWidget';
import { TodayStepsWidget } from '../components/widgets/TodayStepsWidget';
import { useRunHistoryStore } from '../store/useRunHistoryStore';
import { useUserStore } from '../store/useUserStore';
import { formatDistance, formatPace, formatDuration, formatDate } from '../lib/formatters';

const renderLastRun = (renderWidget: (component: React.ReactElement) => void) => {
    const runs = useRunHistoryStore.getState().runs;
    const profile = useUserStore.getState().profile;
    const unit = profile?.preferred_unit || 'km';
    const lastRun = runs && runs.length > 0 ? runs[0] : null;

    if (lastRun) {
        renderWidget(
            React.createElement(LastRunWidget, {
                distance: formatDistance(lastRun.distance_km, unit).replace(' km', '').replace(' mi', ''),
                pace: formatPace(lastRun.avg_pace_min_per_km, unit).replace(' /km', '').replace(' /mi', ''),
                duration: formatDuration(lastRun.duration_seconds),
                date: formatDate(lastRun.started_at),
            })
        );
    } else {
        renderWidget(
            React.createElement(LastRunWidget, {
                distance: '0.0',
                pace: '0:00',
                duration: '00:00',
                date: 'No runs yet',
            })
        );
    }
};

const renderTodaySteps = (renderWidget: (component: React.ReactElement) => void, steps = 0) => {
    renderWidget(
        React.createElement(TodayStepsWidget, {
            steps: steps,
            goal: 10000,
        })
    );
};

// This is the background task that Android calls to update widgets
export async function widgetTaskHandler(props: any) {
    const { widgetName, renderWidget, type } = props;

    if (type === 'WIDGET_UPDATE' || type === 'WIDGET_RESIZE') {
        if (widgetName === 'LastRun') {
            renderLastRun(renderWidget);
        } else if (widgetName === 'TodaySteps') {
            renderTodaySteps(renderWidget);
        }
    }
}

export function updateAppWidgets(todaySteps?: number) {
    requestWidgetUpdate({
        widgetName: 'LastRun',
        renderWidget: (render) => renderLastRun(render),
    });
    
    requestWidgetUpdate({
        widgetName: 'TodaySteps',
        renderWidget: (render) => renderTodaySteps(render, todaySteps),
    });
}

registerWidgetTaskHandler(widgetTaskHandler);
