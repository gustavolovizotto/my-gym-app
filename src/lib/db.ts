import Dexie, { type EntityTable } from "dexie";

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

export interface Workout {
  id: string;
  user_id: string;
  type: "PPL" | "PPL+UP" | "UP" | "ABC";
  created_at: string;
}

export interface WorkoutLog {
  id?: string; // Local ID can be auto-incremented or UUID
  workout_id: string;
  split_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  timestamp: string;
  is_synced: number; // 0 for false, 1 for true
}

const db = new Dexie("FitnessEvolutionDB") as Dexie & {
  exercises: EntityTable<Exercise, "id">;
  workouts: EntityTable<Workout, "id">;
  workout_logs: EntityTable<WorkoutLog, "id">;
};

db.version(3).stores({
  exercises: "id, name, muscle_group",
  workouts: "id, user_id, type, created_at",
  workout_logs: "++id, workout_id, split_id, exercise_id, is_synced, timestamp",
});

export { db };
