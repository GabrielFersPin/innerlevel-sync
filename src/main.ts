import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface InnerLevelSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
  defaultDuration: number;
  defaultEnergyCost: number;
  dashboardPath: string;
}

const DEFAULT_SETTINGS: InnerLevelSettings = {
  supabaseUrl: '', supabaseAnonKey: '', email: '', password: '',
  defaultDuration: 0.5, defaultEnergyCost: 15, dashboardPath: 'Dashboard_General.md',
};
const DUE_TYPES = new Set(['tecnica', 'nota_estudio', 'captura_rapida', 'permanente', 'problema']);
const ARCHIVED_STATUS = '🎉 Completado / Archivado';

export default class InnerLevelSyncPlugin extends Plugin {
  settings!: InnerLevelSettings;
  private client: SupabaseClient | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new InnerLevelSettingTab(this.app, this));
    this.addCommand({ id: 'capture-current-note', name: 'Capture selection / current note', callback: () => this.captureCurrentNote() });
    this.addCommand({ id: 'sync-due-today', name: "Sync today's due notes", callback: () => this.syncDueNotes() });
    this.addCommand({ id: 'resync-due-today', name: "Resync today's due notes", callback: () => this.syncDueNotes(true) });
    this.addCommand({ id: 'open-innerlevel', name: 'Open InnerLevel', callback: () => window.open('https://inner-level-app.vercel.app/', '_blank') });
  }

  async loadSettings(): Promise<void> { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
  async saveSettings(): Promise<void> { this.client = null; await this.saveData(this.settings); }

  private async getClient(): Promise<SupabaseClient> {
    if (!this.settings.supabaseUrl || !this.settings.supabaseAnonKey) throw new Error('Configura Supabase URL y anon key en los ajustes del plugin.');
    if (!this.client) {
      const storage = {
        getItem: async (key: string) => (await this.loadData())?.[`sb_${key}`] ?? null,
        setItem: async (key: string, value: string) => { const data = await this.loadData() || {}; data[`sb_${key}`] = value; await this.saveData(data); },
        removeItem: async (key: string) => { const data = await this.loadData() || {}; delete data[`sb_${key}`]; await this.saveData(data); },
      };
      this.client = createClient(this.settings.supabaseUrl, this.settings.supabaseAnonKey, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    }
    return this.client;
  }

  private async ensureSession(): Promise<SupabaseClient> {
    const client = await this.getClient();
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      if (!this.settings.email || !this.settings.password) throw new Error('Configura email y password en los ajustes del plugin.');
      const { error } = await client.auth.signInWithPassword({ email: this.settings.email, password: this.settings.password });
      if (error) throw error;
    }
    return client;
  }

  async testConnection(): Promise<void> {
    try {
      await this.ensureSession();
      new Notice('InnerLevel Sync: conexión correcta.');
    } catch (error) {
      this.reportError(error);
    }
  }

  private async captureCurrentNote(): Promise<void> {
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) throw new Error('Abre una nota Markdown para capturarla.');
      const file = view.file;
      if (!file) throw new Error('La vista activa no tiene un archivo Markdown.');
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const selection = view.editor.getSelection().trim();
      const description = selection || firstMeaningfulParagraph(view.editor.getValue()) || file.basename;
      const card = this.makeCard(`obsidian-capture-${stableId(file.path)}-${Date.now()}`, file.basename, description, frontmatter, ['obsidian', 'quick-seed']);
      const { error } = await (await this.ensureSession()).rpc('append_obsidian_card', { p_card: card });
      if (error) throw error;
      new Notice(`Capturada: ${file.basename}`);
    } catch (error) { this.reportError(error); }
  }

  private async syncDueNotes(force = false): Promise<void> {
    try {
      const client = await this.ensureSession();
      const today = isoToday();
      const dueNotes = this.app.vault.getMarkdownFiles().filter(file => {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        return isDue(frontmatter, today);
      });
      let synced = 0;
      for (const file of dueNotes) {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        if (!force && frontmatter.innerlevel_last_sync === today) continue;
        const body = await this.app.vault.read(file);
        const card = this.makeCard(`obsidian-${stableId(file.path)}-${today}`, file.basename, dueDescription(file, frontmatter, body), frontmatter, ['obsidian', 'srs', 'due-today']);
        const { error } = await client.rpc('append_obsidian_card', { p_card: card });
        if (error) throw error;
        await this.markSynced(file, card.id, today);
        synced += 1;
      }
      new Notice(synced ? `Sincronizadas ${synced} notas para hoy.` : 'Las notas pendientes ya estaban sincronizadas hoy.');
    } catch (error) { this.reportError(error); }
  }

  private makeCard(id: string, name: string, description: string, frontmatter: Record<string, unknown>, baseTags: string[]): { id: string; [key: string]: unknown } {
    const timing = timingFor(String(frontmatter['tiempo-repaso'] || frontmatter['tiempo-estimado'] || ''), this.settings);
    const area = String(frontmatter.area || '').trim();
    return { id, name, description, type: 'action', rarity: 'common', classTypes: ['strategist', 'warrior', 'creator', 'connector', 'sage'], energyCost: timing.energyCost, duration: timing.duration, impact: 10, skillBonus: [], requirements: {}, conditions: {}, tags: [...baseTags, ...(area ? [slug(area)] : [])], createdAt: new Date().toISOString(), forged: true, usageCount: 0, isOnCooldown: false, priority: priorityFor(frontmatter) };
  }

  private async markSynced(file: TFile, cardId: string, today: string): Promise<void> {
    const content = await this.app.vault.read(file);
    if (content.startsWith('---\n')) {
      const end = content.indexOf('\n---', 4);
      if (end >= 0) {
        const yaml = content.slice(4, end).split('\n').filter(line => !/^innerlevel_(card_id|last_sync):/.test(line));
        yaml.push(`innerlevel_card_id: ${JSON.stringify(cardId)}`, `innerlevel_last_sync: ${today}`);
        await this.app.vault.modify(file, `---\n${yaml.join('\n')}${content.slice(end)}`);
        return;
      }
    }
    await this.app.vault.modify(file, `---\ninnerlevel_card_id: ${JSON.stringify(cardId)}\ninnerlevel_last_sync: ${today}\n---\n${content}`);
  }

  private reportError(error: unknown): void {
    const details = error && typeof error === 'object'
      ? error as { message?: string; code?: string; details?: string; hint?: string }
      : {};
    const message = [details.message, details.code && `code: ${details.code}`, details.details, details.hint]
      .filter(Boolean)
      .join(' | ') || (error instanceof Error ? error.message : 'Error desconocido');
    new Notice(`InnerLevel Sync: ${message}`, 10000);
    console.error('[InnerLevel Sync]', error);
  }
}

class InnerLevelSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: InnerLevelSyncPlugin) { super(app, plugin); }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'InnerLevel Sync' });
    this.textSetting(containerEl, 'Supabase URL', 'supabaseUrl');
    this.textSetting(containerEl, 'Supabase anon key', 'supabaseAnonKey');
    this.textSetting(containerEl, 'Email', 'email');
    this.textSetting(containerEl, 'Password', 'password');
    this.textSetting(containerEl, 'Dashboard path', 'dashboardPath');
    new Setting(containerEl)
      .setName('Connection')
      .setDesc('Usa tu cuenta existente de InnerLevel. No crea usuarios nuevos.')
      .addButton(button => button.setButtonText('Sign in / test').setCta().onClick(() => this.plugin.testConnection()));
    new Setting(containerEl).setName('Default duration (hours)').addText(text => text.setValue(String(this.plugin.settings.defaultDuration)).onChange(async value => { this.plugin.settings.defaultDuration = Number(value) || DEFAULT_SETTINGS.defaultDuration; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Default energy cost').addText(text => text.setValue(String(this.plugin.settings.defaultEnergyCost)).onChange(async value => { this.plugin.settings.defaultEnergyCost = Number(value) || DEFAULT_SETTINGS.defaultEnergyCost; await this.plugin.saveSettings(); }));
  }
  private textSetting(containerEl: HTMLElement, name: string, key: 'supabaseUrl' | 'supabaseAnonKey' | 'email' | 'password' | 'dashboardPath'): void {
    new Setting(containerEl).setName(name).addText(text => {
      text.setValue(this.plugin.settings[key]);
      if (key === 'password') text.inputEl.type = 'password';
      text.onChange(async value => { this.plugin.settings[key] = value; await this.plugin.saveSettings(); });
    });
  }
}

function isoToday(): string { return new Date().toISOString().slice(0, 10); }
function stableId(path: string): string { return path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function slug(value: string): string { return stableId(value); }
function firstMeaningfulParagraph(body: string): string { return body.split(/\n\s*\n/).map(part => part.replace(/^#+\s*/, '').trim()).find(Boolean)?.slice(0, 500) || ''; }
function isDue(frontmatter: Record<string, unknown>, today: string): boolean { const type = String(frontmatter.tipo_nota || ''); const due = String(frontmatter['proxima-revision'] || ''); const level = String(frontmatter['nivel-comprension'] || '').toUpperCase(); return DUE_TYPES.has(type) && Boolean(String(frontmatter.area || '').trim()) && due !== '' && due <= today && String(frontmatter.status || '') !== ARCHIVED_STATUS && level !== 'COMPLETADO'; }
function dueDescription(file: TFile, frontmatter: Record<string, unknown>, body: string): string { return [`Area: ${frontmatter.area || ''}`, `Comprension: ${frontmatter['nivel-comprension'] || 'pendiente'}`, `Tiempo: ${frontmatter['tiempo-repaso'] || frontmatter['tiempo-estimado'] || 'sin estimar'}`, `Obsidian: obsidian://open?vault=${encodeURIComponent(file.vault.getName())}&file=${encodeURIComponent(file.path)}`, '', firstMeaningfulParagraph(body)].join('\n').slice(0, 1500); }
function timingFor(value: string, settings: InnerLevelSettings): { duration: number; energyCost: number } {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  const minutes = normalized.match(/^\+?(\d+(?:\.\d+)?)min(?:utos)?$/);
  const hours = normalized.match(/^\+?(\d+(?:\.\d+)?)h(?:ora?s)?$/);
  const duration = minutes
    ? Number(minutes[1]) / 60
    : hours
      ? Number(hours[1])
      : undefined;

  if (duration !== undefined && Number.isFinite(duration)) {
    const energyCost = duration <= 5 / 60 ? 10 : duration <= 15 / 60 ? 15 : duration <= 30 / 60 ? 20 : 25;
    return { duration, energyCost };
  }

  return { duration: settings.defaultDuration, energyCost: settings.defaultEnergyCost };
}
function priorityFor(frontmatter: Record<string, unknown>): number { const value = `${frontmatter.prioridad || ''} ${frontmatter['nivel-comprension'] || ''} ${frontmatter['resultado-repaso'] || ''}`.toLowerCase(); return /❓|🤔|fallado|dificil|difícil/.test(value) ? 4 : /alta|alto/.test(value) ? 4 : /baja|bajo/.test(value) ? 2 : 3; }