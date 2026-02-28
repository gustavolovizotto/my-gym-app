// =============================================
// XP System — Levels, Achievements, Pure Logic
// =============================================

export interface Level {
  name: string;
  minXP: number;
  maxXP: number;
  emoji: string;
  colorClass: string;
}

export const LEVELS: Level[] = [
  { name: "Iniciante",     minXP: 0,      maxXP: 499,   emoji: "🥉", colorClass: "text-base-content/60" },
  { name: "Intermediário", minXP: 500,    maxXP: 1999,  emoji: "🥈", colorClass: "text-blue-400" },
  { name: "Avançado",      minXP: 2000,   maxXP: 4999,  emoji: "🥇", colorClass: "text-green-400" },
  { name: "Elite",         minXP: 5000,   maxXP: 9999,  emoji: "💎", colorClass: "text-yellow-400" },
  { name: "Lenda",         minXP: 10000,  maxXP: Infinity, emoji: "👑", colorClass: "text-primary" },
];

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  xpBonus: number;
  category: "treinos" | "sequencia" | "volume" | "nivel";
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  // Treinos
  first_workout: {
    key: "first_workout",
    title: "Primeira Pedrada",
    description: "Complete seu primeiro treino",
    icon: "💪",
    xpBonus: 50,
    category: "treinos",
  },
  workouts_10: {
    key: "workouts_10",
    title: "Dez no Caixote",
    description: "10 treinos completos",
    icon: "🔟",
    xpBonus: 100,
    category: "treinos",
  },
  workouts_30: {
    key: "workouts_30",
    title: "Mês de Suor",
    description: "30 treinos completos",
    icon: "📅",
    xpBonus: 200,
    category: "treinos",
  },
  workouts_50: {
    key: "workouts_50",
    title: "Cinquentão",
    description: "50 treinos completos",
    icon: "🏆",
    xpBonus: 300,
    category: "treinos",
  },
  workouts_100: {
    key: "workouts_100",
    title: "Centenário",
    description: "100 treinos completos",
    icon: "💯",
    xpBonus: 500,
    category: "treinos",
  },
  // Sequências
  streak_3: {
    key: "streak_3",
    title: "Trilogia",
    description: "3 dias de treino seguidos",
    icon: "🔥",
    xpBonus: 30,
    category: "sequencia",
  },
  streak_7: {
    key: "streak_7",
    title: "Semana Perfeita",
    description: "7 dias de treino seguidos",
    icon: "⚡",
    xpBonus: 70,
    category: "sequencia",
  },
  streak_14: {
    key: "streak_14",
    title: "Quinzena Brutal",
    description: "14 dias de treino seguidos",
    icon: "🦾",
    xpBonus: 150,
    category: "sequencia",
  },
  streak_30: {
    key: "streak_30",
    title: "Mês de Ferro",
    description: "30 dias de treino seguidos",
    icon: "🔱",
    xpBonus: 300,
    category: "sequencia",
  },
  // Volume
  volume_1000_session: {
    key: "volume_1000_session",
    title: "Tonelada",
    description: "1.000 kg em uma sessão",
    icon: "🏋️",
    xpBonus: 50,
    category: "volume",
  },
  volume_10000_total: {
    key: "volume_10000_total",
    title: "Deus do Volume",
    description: "10.000 kg movidos no total",
    icon: "⚖️",
    xpBonus: 100,
    category: "volume",
  },
  volume_100000_total: {
    key: "volume_100000_total",
    title: "Monstro do Ferro",
    description: "100.000 kg movidos no total",
    icon: "💀",
    xpBonus: 500,
    category: "volume",
  },
  // Nível
  level_intermediario: {
    key: "level_intermediario",
    title: "Intermediário",
    description: "Alcançou o nível Intermediário",
    icon: "🥈",
    xpBonus: 0,
    category: "nivel",
  },
  level_avancado: {
    key: "level_avancado",
    title: "Avançado",
    description: "Alcançou o nível Avançado",
    icon: "🥇",
    xpBonus: 0,
    category: "nivel",
  },
  level_elite: {
    key: "level_elite",
    title: "Elite",
    description: "Alcançou o nível Elite",
    icon: "💎",
    xpBonus: 0,
    category: "nivel",
  },
  level_lenda: {
    key: "level_lenda",
    title: "LENDA",
    description: "Alcançou o nível Lenda",
    icon: "👑",
    xpBonus: 0,
    category: "nivel",
  },
};

export function getLevelFromXP(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(xp: number): Level | null {
  const current = getLevelFromXP(xp);
  const idx = LEVELS.findIndex((l) => l.name === current.name);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export function getProgressPercent(xp: number): number {
  const current = getLevelFromXP(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  const range = next.minXP - current.minXP;
  const earned = xp - current.minXP;
  return Math.min(100, Math.round((earned / range) * 100));
}

export interface WorkoutStats {
  totalWorkouts: number;
  streak: number;
  sessionVolume: number;
  totalVolume: number;
}

export function checkNewAchievements(
  stats: WorkoutStats,
  existingKeys: string[]
): AchievementDef[] {
  const unlocked: AchievementDef[] = [];

  const add = (key: string) => {
    if (!existingKeys.includes(key) && ACHIEVEMENTS[key]) {
      unlocked.push(ACHIEVEMENTS[key]);
    }
  };

  // Treinos
  if (stats.totalWorkouts >= 1)   add("first_workout");
  if (stats.totalWorkouts >= 10)  add("workouts_10");
  if (stats.totalWorkouts >= 30)  add("workouts_30");
  if (stats.totalWorkouts >= 50)  add("workouts_50");
  if (stats.totalWorkouts >= 100) add("workouts_100");

  // Sequência
  if (stats.streak >= 3)  add("streak_3");
  if (stats.streak >= 7)  add("streak_7");
  if (stats.streak >= 14) add("streak_14");
  if (stats.streak >= 30) add("streak_30");

  // Volume
  if (stats.sessionVolume >= 1000)   add("volume_1000_session");
  if (stats.totalVolume >= 10000)    add("volume_10000_total");
  if (stats.totalVolume >= 100000)   add("volume_100000_total");

  return unlocked;
}

export function checkLevelAchievements(
  previousXP: number,
  newXP: number,
  existingKeys: string[]
): AchievementDef[] {
  const levelToKey: Record<string, string> = {
    "Intermediário": "level_intermediario",
    "Avançado":      "level_avancado",
    "Elite":         "level_elite",
    "Lenda":         "level_lenda",
  };

  const unlocked: AchievementDef[] = [];
  const prevLevel = getLevelFromXP(previousXP);
  const newLevel  = getLevelFromXP(newXP);

  if (prevLevel.name !== newLevel.name) {
    const key = levelToKey[newLevel.name];
    if (key && !existingKeys.includes(key) && ACHIEVEMENTS[key]) {
      unlocked.push(ACHIEVEMENTS[key]);
    }
  }

  return unlocked;
}

export function calcSessionXP(numSets: number, streak: number): number {
  const base       = 50;
  const setsBonus  = numSets * 5;
  const streakBonus = Math.min(streak * 2, 100);
  return base + setsBonus + streakBonus;
}
