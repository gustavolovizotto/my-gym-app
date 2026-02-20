import Dexie, { type EntityTable } from "dexie";

export interface WorkoutDivision {
  id: string;
  user_id: string;
  name: string;
  frequency?: number;
  created_at: string;
}

export interface WorkoutSplit {
  id: string;
  division_id: string;
  name: string;
  order_index: number;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  split_id: string;
  rest_time: number;
  target_sets: number;
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
  workout_divisions: EntityTable<WorkoutDivision, "id">;
  workout_splits: EntityTable<WorkoutSplit, "id">;
  exercises: EntityTable<Exercise, "id">;
  workout_logs: EntityTable<WorkoutLog, "id">;
};

db.version(4).stores({
  workout_divisions: "id, user_id, name, created_at",
  workout_splits: "id, division_id, name, order_index, created_at",
  exercises: "id, name, muscle_group, split_id",
  workout_logs: "++id, workout_id, split_id, exercise_id, is_synced, timestamp",
});

export { db };
