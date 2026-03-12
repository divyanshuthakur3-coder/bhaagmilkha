const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

/**
 * Encodes a list of coordinates into a Google Polyline string.
 */
function encodePolyline(points) {
    let lastLat = 0;
    let lastLng = 0;
    let result = '';

    function encode(value) {
        let v = value < 0 ? ~(value << 1) : value << 1;
        while (v >= 0x20) {
            result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
            v >>= 5;
        }
        result += String.fromCharCode(v + 63);
    }

    for (const point of points) {
        const lat = Math.round(point.latitude * 1e5);
        const lng = Math.round(point.longitude * 1e5);
        encode(lat - lastLat);
        encode(lng - lastLng);
        lastLat = lat;
        lastLng = lng;
    }
    return result;
}

/**
 * Decodes a Google Polyline string into a list of coordinates.
 */
function decodePolyline(str) {
    if (!str) return [];
    let index = 0, lat = 0, lng = 0, result = [];
    while (index < str.length) {
        let b, shift = 0, result_val = 0;
        do {
            b = str.charCodeAt(index++) - 63;
            result_val |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result_val & 1) ? ~(result_val >> 1) : (result_val >> 1));
        lat += dlat;
        shift = 0;
        result_val = 0;
        do {
            b = str.charCodeAt(index++) - 63;
            result_val |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result_val & 1) ? ~(result_val >> 1) : (result_val >> 1));
        lng += dlng;
        result.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return result;
}

function parseCoordinates(data) {
    if (!data) return [];
    if (typeof data !== 'string') return data;
    if (data.startsWith('[') || data.startsWith('{')) {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return decodePolyline(data);
}

/**
 * Helper to update weekly_stats
 */
async function updateWeeklyStats(userId, dateStr, distance, duration, pace) {
    try {
        const date = new Date(dateStr);
        // Get Monday of that week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const mondayStr = monday.toISOString().split('T')[0];

        await db.query(`
            INSERT INTO weekly_stats (id, user_id, week_start, total_distance_km, total_runs, total_duration_seconds, best_pace)
            VALUES (UUID(), ?, ?, ?, 1, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_distance_km = total_distance_km + VALUES(total_distance_km),
                total_runs = total_runs + 1,
                total_duration_seconds = total_duration_seconds + VALUES(total_duration_seconds),
                best_pace = IF(best_pace IS NULL OR VALUES(best_pace) < best_pace, VALUES(best_pace), best_pace)
        `, [userId, mondayStr, distance, duration, pace]);
    } catch (err) {
        console.error('Weekly stats update error:', err);
    }
}

module.exports = {
    encodePolyline,
    decodePolyline,
    parseCoordinates,

    saveRun: async (userId, runData) => {
        const id = uuidv4();
        const { name, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, route_coordinates, notes, shoe_id, weather } = runData;
        
        const compressedCoords = Array.isArray(route_coordinates) ? encodePolyline(route_coordinates) : route_coordinates;

        await db.query(
            `INSERT INTO runs (id, user_id, name, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, route_coordinates, notes, shoe_id, weather)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, name, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, compressedCoords, notes, shoe_id, weather]
        );

        if (shoe_id) {
            await db.query('UPDATE shoes SET total_km = total_km + ? WHERE id = ? AND user_id = ?', [distance_km, shoe_id, userId]);
        }

        // Update weekly stats
        await updateWeeklyStats(userId, started_at, distance_km, duration_seconds, avg_pace_min_per_km);

        const [runs] = await db.query('SELECT * FROM runs WHERE id = ?', [id]);
        const run = runs[0];
        run.route_coordinates = parseCoordinates(run.route_coordinates);
        return run;
    },

    getAllRuns: async (userId, limit = 50, offset = 0) => {
        const [runs] = await db.query(
            'SELECT * FROM runs WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );
        return runs.map(r => ({
            ...r,
            route_coordinates: parseCoordinates(r.route_coordinates),
        }));
    }
};
