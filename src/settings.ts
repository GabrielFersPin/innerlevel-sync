export const DEFAULT_APP_URL = "https://inner-level-app.vercel.app/";

export interface InnerLevelSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
  appUrl: string;
  dashboardPath: string;
  defaultEnergyCost: number;
  defaultDuration: number;
}

export const DEFAULT_SETTINGS: InnerLevelSettings = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  email: "",
  password: "",
  appUrl: DEFAULT_APP_URL,
  dashboardPath: "Dashboard_General.md",
  defaultEnergyCost: 15,
  defaultDuration: 0.5,
};

export interface StoredSession {
  access_token: string;
  refresh_token: string;
}

export interface PluginData {
  settings: InnerLevelSettings;
  session: StoredSession | null;
}
