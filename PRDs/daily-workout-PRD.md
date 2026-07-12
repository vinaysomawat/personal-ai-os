# Feature Specification: Daily Workout Planner

## Objective

Build an intelligent **Daily Workout Planner** for the Health module that generates a personalized workout plan for the user. The planner should behave like a personal gym coach, ensuring workout continuity, avoiding duplicate plans, and integrating seamlessly with the Planner module.

The system should maintain only one active workout at a time and should never generate a new workout until the current one has been completed or explicitly skipped.

---

# Core Requirements

## Generate One Active Workout

The system should generate only one active workout plan at any given time.

If an active workout already exists, always return that workout instead of generating a new one.

---

## Prevent Duplicate Plans

The AI should not generate duplicate workout plans.

Before creating a new workout, it should consider:

* The currently active workout.
* The previous workout history.
* Recently trained muscle groups.
* Recent workout patterns.

The goal is to provide sufficient variation while following a logical training split and recovery schedule.

---

## Planner Module Integration

Whenever a workout plan is generated, automatically create a corresponding task in the Planner module.

The workout should appear as one of the user's daily tasks.

The Planner module becomes the source of truth for completion status.

When the workout is completed in the Planner, it should automatically be marked as completed in the Health module.

Similarly, if it is completed from the Health module, the Planner should reflect the same status.

The user should never have to mark completion in two different places.

---

## Do Not Generate New Workouts Until Completion

If today's workout has not been completed, opening the Health module should continue showing the existing workout.

The system must not generate another workout simply because a new day has started.

Only after the current workout has been completed (or explicitly skipped) should the next workout be generated.

This ensures consistency and prevents users from accumulating unfinished workout plans.

---

## Workout Generation

Each workout should include everything needed to complete the session, including:

* Workout focus
* Warm-up
* Exercises
* Sets and reps
* Rest duration
* Cardio recommendations (when applicable)
* Cool-down or stretching
* Estimated workout duration
* Estimated calories burned
* Helpful coaching notes or tips

The workout should be easy to follow inside the application.

---

## Intelligent Workout Rotation

The planner should naturally rotate muscle groups to ensure proper recovery and balanced training.

Examples include:

* Push
* Pull
* Legs
* Upper Body
* Lower Body
* Full Body
* Core
* Cardio & Recovery

The planner should avoid scheduling the same muscle groups on consecutive workouts unless explicitly required.

---

## Workout History

Maintain a history of only the **last 7 completed workout plans**.

Older workout plans should be automatically removed from history.

The recent history should be used to:

* Avoid repeating recent workouts.
* Balance muscle group distribution.
* Improve workout variety.
* Display recent workout history to the user.

Only the last seven completed workouts need to be retained.

---

## Workout Status

A workout can exist in one of the following states:

* Pending
* In Progress
* Completed
* Skipped

The current status should always be visible to the user.

---

## Dashboard Integration

The Dashboard should always display:

* Current workout
* Current workout status
* Workout focus
* Estimated duration
* Progress toward completion

If there is no active workout, the dashboard should encourage generating the next workout.

---

## User Experience

The experience should feel like working with a personal trainer.

The system should:

* Remember what the user has recently trained.
* Avoid repetitive workouts.
* Encourage workout consistency.
* Keep workouts balanced across the week.
* Minimize unnecessary AI generations by reusing the current active workout until it is completed.

---

## Success Criteria

A successful implementation should ensure that:

* Only one workout is active at any time.
* The same workout is never regenerated unnecessarily.
* New workouts are generated only after the previous one is completed or skipped.
* Workout completion stays synchronized between the Health and Planner modules.
* Recent workout history is limited to the last **7 completed workouts**.
* The workout planner provides varied, well-balanced training sessions that support long-term consistency and recovery.
