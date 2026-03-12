const { z } = require('zod');

const runSchema = z.object({
    name: z.string().optional(),
    started_at: z.string(),
    ended_at: z.string(),
    distance_km: z.number().nonnegative(),
    duration_seconds: z.number().int().positive(),
    avg_pace_min_per_km: z.number().nonnegative(),
    calories_burned: z.number().optional().nullable(),
    route_coordinates: z.union([z.string(), z.array(z.object({
        latitude: z.number(),
        longitude: z.number()
    }))]),
    notes: z.string().optional().nullable(),
    shoe_id: z.string().uuid().optional().nullable(),
    weather: z.string().optional().nullable()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

const signupSchema = loginSchema.extend({
    name: z.string().min(1)
});

module.exports = {
    runSchema,
    loginSchema,
    signupSchema
};
