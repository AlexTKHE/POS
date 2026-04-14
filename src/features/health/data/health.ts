import { supabase } from "../../../lib/supabase/client";

export type HealthDailyLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  sleep_hours: number;
  morning_weight_lb: number;
  steps_yesterday: number;
  soreness: number;
  energy: number;
  created_at: string;
  updated_at: string;
};

export type HealthHydrationSettingsRow = {
  user_id: string;
  bottle_size_oz: number;
  height_inches: number | null;
  weight_pounds: number | null;
  manual_goal_oz: number | null;
  created_at: string;
  updated_at: string;
};

export type HealthHydrationDayRow = {
  id: string;
  user_id: string;
  hydration_date: string;
  bottle_count: number;
  bottle_size_oz: number;
  total_oz: number;
  created_at: string;
  updated_at: string;
};

export type UpsertHealthDailyLogInput = {
  log_date: string;
  sleep_hours: number;
  morning_weight_lb: number;
  steps_yesterday: number;
  soreness: number;
  energy: number;
};

export type UpsertHydrationSettingsInput = {
  bottle_size_oz: number;
  height_inches: number | null;
  weight_pounds: number | null;
  manual_goal_oz?: number | null;
};

export type UpsertHydrationDayInput = {
  hydration_date: string;
  bottle_count: number;
  bottle_size_oz: number;
  total_oz: number;
};

export async function getCurrentHealthUser() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    return null;
  }

  return session.user;
}

export async function signInHealthUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signUpHealthUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function requireUserId() {
  const user = await getCurrentHealthUser();

  if (!user) {
    throw new Error("Please sign in before saving Health data.");
  }

  return user.id;
}

export async function ensureHealthSession() {
  return requireUserId();
}

export async function upsertHealthDailyLog(input: UpsertHealthDailyLogInput) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("health_daily_logs")
    .upsert(
      {
        user_id: userId,
        ...input,
      },
      {
        onConflict: "user_id,log_date",
      }
    )
    .select()
    .single<HealthDailyLogRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertHydrationSettings(input: UpsertHydrationSettingsInput) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("health_hydration_settings")
    .upsert(
      {
        user_id: userId,
        ...input,
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single<HealthHydrationSettingsRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertHydrationDay(input: UpsertHydrationDayInput) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("health_hydration_days")
    .upsert(
      {
        user_id: userId,
        ...input,
      },
      {
        onConflict: "user_id,hydration_date",
      }
    )
    .select()
    .single<HealthHydrationDayRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchRecentHealthDailyLogs(limit = 14) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("health_daily_logs")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .limit(limit)
    .returns<HealthDailyLogRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchHealthDailyLog(logDate: string) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("health_daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .maybeSingle<HealthDailyLogRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchTodayHydrationDay(hydrationDate: string) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("health_hydration_days")
    .select("*")
    .eq("user_id", userId)
    .eq("hydration_date", hydrationDate)
    .maybeSingle<HealthHydrationDayRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchHydrationSettings() {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("health_hydration_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<HealthHydrationSettingsRow>();

  if (error) {
    throw error;
  }

  return data;
}
