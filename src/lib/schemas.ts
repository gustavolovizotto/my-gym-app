import { z } from "zod";

export const workoutLogSchema = z.object({
  weight: z
    .number({ invalid_type_error: "Peso deve ser um número" })
    .positive("O peso deve ser maior que zero"),
  reps: z
    .number({ invalid_type_error: "Repetições devem ser um número" })
    .int("Repetições devem ser um número inteiro")
    .positive("As repetições devem ser maiores que zero"),
});

export type WorkoutLogFormData = z.infer<typeof workoutLogSchema>;
