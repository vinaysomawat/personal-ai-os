# Professional Workout Library Generation Specification

## Objective

Create a **production-ready, database-ready JSON workout library** for a
Personal AI OS.

This is **not** a daily workout generator. Generate a reusable
collection of workout templates that can be intelligently rotated based
on workout history, recovery, and recently trained muscle groups.

------------------------------------------------------------------------

# User Profile

-   Age: 29
-   Height: 183 cm
-   Weight: 108 kg
-   Fitness Level: Intermediate
-   Training Location: Gym
-   Experience: Comfortable using free weights, barbells, dumbbells,
    cables and machines.

## Goals

-   Lose body fat
-   Build lean muscle
-   Improve strength
-   Improve endurance
-   Improve overall fitness

Design workouts specifically for this profile.

Since the athlete weighs 108 kg, prioritize exercises that maximize fat
loss while minimizing unnecessary joint stress.

------------------------------------------------------------------------

# Workout Categories

Generate **5 unique variations** for each category:

1.  Chest & Triceps
2.  Back & Biceps
3.  Legs
4.  Shoulders
5.  Arms
6.  Core & Abs
7.  Full Body
8.  Cardio & Conditioning
9.  HIIT
10. Mobility & Recovery
11. Active Recovery

Do **not** generate Push, Pull, Upper Body, or Lower Body workouts.

------------------------------------------------------------------------

# Workout Requirements

Every workout must contain:

-   Unique ID
-   Workout Name
-   Category
-   Difficulty
-   Estimated Duration
-   Estimated Calories Burned
-   Primary Muscle Groups
-   Secondary Muscle Groups
-   Required Equipment
-   Training Environment
-   Dynamic Warm-up
-   Exercises
-   Sets
-   Repetitions
-   Rest Time
-   Tempo
-   RPE
-   Exercise Notes
-   Cardio Recommendation
-   Cool-down
-   Coach Tips
-   Tags

Each workout should include:

-   5--8 primary exercises
-   1--2 accessory exercises
-   Dynamic warm-up
-   Cardio finisher (when appropriate)
-   Cool-down stretching

Exercise order:

1.  Warm-up
2.  Heavy compound lifts
3.  Secondary compound lifts
4.  Isolation exercises
5.  Accessory work
6.  Cardio
7.  Stretching

------------------------------------------------------------------------

# Fat Loss Guidelines

-   Emphasize compound movements.
-   Preserve muscle while dieting.
-   Use progressive overload.
-   Include appropriate cardio.
-   Avoid unnecessary joint stress.
-   Prevent overtraining.

------------------------------------------------------------------------

# Cardio Guidelines

Allowed cardio:

-   Incline treadmill walking
-   StairMaster
-   Rowing
-   Assault Bike
-   Cycling
-   Elliptical

Specify:

-   Duration
-   Intensity
-   Target heart-rate zone (when applicable)

------------------------------------------------------------------------

# Coach Tips

Include practical coaching advice:

-   Breathing cues
-   Posture reminders
-   Common mistakes
-   Progression recommendations
-   Recovery suggestions

------------------------------------------------------------------------

# Tags

Examples:

-   Fat Loss
-   Hypertrophy
-   Strength
-   Conditioning
-   Intermediate
-   High Volume
-   Compound Focus
-   Machine Based
-   Free Weight

------------------------------------------------------------------------

# JSON Schema

``` json
{
  "id": "CHEST_TRICEPS_001",
  "name": "Chest & Triceps - Variation 1",
  "category": "Chest & Triceps",
  "difficulty": "Intermediate",
  "duration": 75,
  "estimatedCalories": 550,
  "primaryMuscles": [],
  "secondaryMuscles": [],
  "equipment": [],
  "environment": "Gym",
  "warmup": [],
  "exercises": [
    {
      "name": "",
      "sets": 4,
      "reps": "8-10",
      "rest": "90 sec",
      "tempo": "2-1-2",
      "rpe": 8,
      "notes": ""
    }
  ],
  "cardio": {
    "type": "",
    "duration": "",
    "intensity": "",
    "targetHeartRateZone": ""
  },
  "cooldown": [],
  "coachTips": [],
  "tags": []
}
```

------------------------------------------------------------------------

# Expected Output

-   Return **valid JSON only**.
-   No explanations.
-   No markdown.
-   No commentary.
-   Database-ready.
-   No duplicate workouts.
-   Five unique variations per category.
-   Evidence-based programming suitable for at least **12 weeks** of
    training rotation.

## Note

The complete library contains **55 workouts** and is too large for a
single LLM response. Generate it in multiple batches while preserving
the same schema and quality.
