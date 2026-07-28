import { describe, it, expect } from "vitest";
import { workoutLogSchema } from "@/lib/schemas";

describe("workoutLogSchema", () => {
  it("aceita peso e repetições válidos", () => {
    const result = workoutLogSchema.safeParse({ weight: 60, reps: 10 });
    expect(result.success).toBe(true);
  });

  it("aceita peso decimal", () => {
    const result = workoutLogSchema.safeParse({ weight: 82.5, reps: 8 });
    expect(result.success).toBe(true);
  });

  it("rejeita peso zero", () => {
    const result = workoutLogSchema.safeParse({ weight: 0, reps: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("O peso deve ser maior que zero");
    }
  });

  it("rejeita peso negativo", () => {
    const result = workoutLogSchema.safeParse({ weight: -5, reps: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("O peso deve ser maior que zero");
    }
  });

  it("rejeita repetições zero", () => {
    const result = workoutLogSchema.safeParse({ weight: 60, reps: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("As repetições devem ser maiores que zero");
    }
  });

  it("rejeita repetições negativas", () => {
    const result = workoutLogSchema.safeParse({ weight: 60, reps: -3 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("As repetições devem ser maiores que zero");
    }
  });

  it("rejeita repetições fracionadas", () => {
    const result = workoutLogSchema.safeParse({ weight: 60, reps: 10.5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Repetições devem ser um número inteiro");
    }
  });

  it("rejeita peso não-numérico", () => {
    const result = workoutLogSchema.safeParse({ weight: "abc", reps: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Peso deve ser um número");
    }
  });

  it("rejeita reps não-numérico", () => {
    const result = workoutLogSchema.safeParse({ weight: 60, reps: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Repetições devem ser um número");
    }
  });
});
