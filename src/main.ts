import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SettingDefinitionItem, TFile } from 'obsidian';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type SyncMode = 'individual' | 'area';

interface InnerLevelSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
  defaultDuration: number;
  defaultEnergyCost: number;
  dashboardPath: string;
  autoSyncToday: boolean;
  autoSyncLastRun?: string;
  syncMode: SyncMode;
}

const DEFAULT_SETTINGS: InnerLevelSettings = {
  supabaseUrl: '', supabaseAnonKey: '', email: '', password: '',
  defaultDuration: 0.5, defaultEnergyCost: 15, dashboardPath: 'Dashboard_General.md',
  autoSyncToday: false,
  syncMode: 'area',
};

const DUE_TYPES = new Set([
  // Spanish
  'tecnica', 'nota_estudio', 'captura_rapida', 'permanente', 'problema',
  // English
  'technical', 'study_note', 'quick_capture', 'permanent', 'problem'
]);

export default class InnerLevelSyncPlugin extends Plugin {
  settings!: InnerLevelSettings;
  private client: SupabaseClient | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new InnerLevelSettingTab(this.app, this));
    this.addCommand({ id: 'capture-current-note', name: 'Capture selection / current note', callback: () => this.captureCurrentNote() });
    this.addCommand({ id: 'sync-due-today', name: "Sync today's due notes", callback: () => this.syncDueNotes() });
    this.addCommand({ id: 'sync-due-today-area', name: "Sync today's due notes (by area)", callback: () => this.syncDueNotes(false, 'area') });
    this.addCommand({ id: 'sync-due-today-individual', name: "Sync today's due notes (individual)", callback: () => this.syncDueNotes(false, 'individual') });
    this.addCommand({ id: 'resync-due-today', name: "Resync today's due notes", callback: () => this.syncDueNotes(true) });
    this.addCommand({ id: 'open-innerlevel', name: 'Open InnerLevel', callback: () => window.open('https://inner-level-app.vercel.app/', '_blank') });
    this.app.workspace.onLayoutReady(() => { void this.syncAutomatically(); });
  }

  onunload(): void {
    this.client = null;
  }

  async loadSettings(): Promise<void> {
    const stored = ((await this.loadData()) as Record<string, unknown> | null) || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored, { password: '' });
    const currentAuthKey = authStorageKey(this.settings.supabaseUrl);
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(stored)) {
      if (!key.startsWith('sb_') || key === currentAuthKey) {
        cleaned[key] = stored[key];
      }
    }
    await this.saveData({ ...cleaned, ...this.settings });
  }

  async saveSettings(): Promise<void> {
    this.client = null;
    const stored = ((await this.loadData()) as Record<string, unknown> | null) || {};
    const currentAuthKey = authStorageKey(this.settings.supabaseUrl);
    const authData: Record<string, unknown> = {};
    for (const key of Object.keys(stored)) {
      if (!key.startsWith('sb_') || key === currentAuthKey) {
        authData[key] = stored[key];
      }
    }
    await this.saveData({ ...authData, ...this.settings, password: '' });
  }

  private async getClient(): Promise<SupabaseClient> {
    if (!this.settings.supabaseUrl || !this.settings.supabaseAnonKey) throw new Error('Configura Supabase URL y anon key en los ajustes del plugin.');
    if (!this.client) {
      const storage = {
        getItem: async (key: string): Promise<string | null> => {
          const data = (await this.loadData() as Record<string, unknown> | null) || {};
          const val = data[`sb_${key}`];
          return typeof val === 'string' ? val : null;
        },
        setItem: async (key: string, value: string): Promise<void> => {
          const data = (await this.loadData() as Record<string, unknown> | null) || {};
          data[`sb_${key}`] = value;
          await this.saveData(data);
        },
        removeItem: async (key: string): Promise<void> => {
          const data = (await this.loadData() as Record<string, unknown> | null) || {};
          delete data[`sb_${key}`];
          await this.saveData(data);
        },
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

  private async syncAutomatically(): Promise<void> {
    if (!this.settings.autoSyncToday || this.settings.autoSyncLastRun === isoToday()) return;
    const synced = await this.syncDueNotes();
    if (synced) {
      this.settings.autoSyncLastRun = isoToday();
      await this.saveSettings();
    }
  }

  private async syncDueNotes(force = false, modeOverride?: SyncMode): Promise<boolean> {
    try {
      const client = await this.ensureSession();
      const today = isoToday();
      const mode = modeOverride || this.settings.syncMode || 'area';
      const dueNotes = this.app.vault.getMarkdownFiles().filter(file => {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        return isDue(frontmatter, today);
      });

      const notesToSync: { file: TFile; frontmatter: Record<string, unknown>; body: string }[] = [];
      for (const file of dueNotes) {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        if (!force && frontmatter.innerlevel_last_sync === today) continue;
        const body = await this.app.vault.read(file);
        notesToSync.push({ file, frontmatter, body });
      }

      if (notesToSync.length === 0) {
        if (!force) new Notice('Las notas pendientes ya estaban sincronizadas hoy.');
        return true;
      }

      let syncedCount = 0;

      if (mode === 'area') {
        const areaGroups = new Map<string, { file: TFile; frontmatter: Record<string, unknown>; body: string }[]>();
        for (const item of notesToSync) {
          const areaName = getArea(item.frontmatter) || 'Sin Área';
          if (!areaGroups.has(areaName)) areaGroups.set(areaName, []);
          areaGroups.get(areaName)!.push(item);
        }

        for (const [areaName, items] of areaGroups.entries()) {
          const cardId = `obsidian-area-${slug(areaName)}-${today}`;
          let totalDurationHours = 0;
          let maxPriority = 3;
          const noteListLines: string[] = [];

          for (const item of items) {
            const timing = timingFor(getReviewTime(item.frontmatter), this.settings);
            totalDurationHours += timing.duration;
            const prio = priorityFor(item.frontmatter);
            if (prio > maxPriority) maxPriority = prio;

            const durationFormatted = formatDuration(timing.duration);
            const level = getComprehension(item.frontmatter) || 'pendiente';
            const link = `obsidian://open?vault=${encodeURIComponent(item.file.vault.getName())}&file=${encodeURIComponent(item.file.path)}`;
            noteListLines.push(`• ${item.file.basename} (${durationFormatted} | Comprensión: ${level})\n  ${link}`);
          }

          const totalFormatted = formatDuration(totalDurationHours);
          const energyCost = energyCostForDuration(totalDurationHours, this.settings);

          const cardName = `Repaso Área: ${areaName}`;
          const cardDescription = [
            `📚 Área: ${areaName}`,
            `⏱️ Tiempo total acumulado: ${totalFormatted}`,
            `📝 Notas a repasar (${items.length}):`,
            '',
            ...noteListLines
          ].join('\n').slice(0, 3000);

          const card = {
            id: cardId,
            name: cardName,
            description: cardDescription,
            type: 'action',
            rarity: 'common',
            classTypes: ['strategist', 'warrior', 'creator', 'connector', 'sage'],
            energyCost: energyCost,
            duration: Math.round(totalDurationHours * 100) / 100,
            impact: Math.min(50, items.length * 10),
            skillBonus: [],
            requirements: {},
            conditions: {},
            tags: ['obsidian', 'srs', 'due-today', 'area-summary', slug(areaName)],
            createdAt: new Date().toISOString(),
            forged: true,
            usageCount: 0,
            isOnCooldown: false,
            priority: maxPriority,
          };

          const { error } = await client.rpc('append_obsidian_card', { p_card: card });
          if (error) throw error;

          for (const item of items) {
            await this.markSynced(item.file, cardId, today);
            syncedCount += 1;
          }
        }

        new Notice(`Sincronizadas ${syncedCount} notas en ${areaGroups.size} área(s).`);
      } else {
        for (const item of notesToSync) {
          const card = this.makeCard(`obsidian-${stableId(item.file.path)}-${today}`, item.file.basename, dueDescription(item.file, item.frontmatter, item.body), item.frontmatter, ['obsidian', 'srs', 'due-today']);
          const { error } = await client.rpc('append_obsidian_card', { p_card: card });
          if (error) throw error;
          await this.markSynced(item.file, card.id, today);
          syncedCount += 1;
        }
        new Notice(`Sincronizadas ${syncedCount} notas individuales para hoy.`);
      }

      return true;
    } catch (error) { this.reportError(error); return false; }
  }

  private makeCard(id: string, name: string, description: string, frontmatter: Record<string, unknown>, baseTags: string[]): { id: string; [key: string]: unknown } {
    const timing = timingFor(getReviewTime(frontmatter), this.settings);
    const area = getArea(frontmatter);
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
      ? (error as { message?: string; code?: string; details?: string; hint?: string })
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

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: 'group',
        heading: 'Configuration',
        items: [
          { name: 'Supabase URL', control: { type: 'text', key: 'supabaseUrl' } },
          { name: 'Supabase anon key', control: { type: 'text', key: 'supabaseAnonKey' } },
          { name: 'Email', control: { type: 'text', key: 'email' } },
          { name: 'Password', control: { type: 'text', key: 'password' } },
          { name: 'Dashboard path', control: { type: 'text', key: 'dashboardPath' } },
          {
            name: 'Connection',
            desc: 'Usa tu cuenta existente de InnerLevel. No crea usuarios nuevos.',
            action: () => { void this.plugin.testConnection(); },
          },
          {
            name: 'Modo de sincronización / Sync Mode',
            desc: 'Elige si deseas crear una carta por cada nota individual o agrupar por área mostrando el tiempo total acumulado.',
            control: {
              type: 'dropdown',
              key: 'syncMode',
              options: {
                area: 'Por Área / By Area (cartas agrupadas con tiempo total)',
                individual: 'Individual (una carta por nota)',
              },
            },
          },
          {
            name: 'Automatic daily sync',
            desc: 'Sincroniza una vez al abrir Obsidian, después de cargar el vault.',
            control: { type: 'toggle', key: 'autoSyncToday' },
          },
          {
            name: 'Default duration (hours)',
            control: { type: 'number', key: 'defaultDuration', min: 0, step: 0.25 },
          },
          {
            name: 'Default energy cost',
            control: { type: 'number', key: 'defaultEnergyCost', min: 0, step: 1 },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    if (!isSettingKey(key)) throw new Error(`Unknown setting key: ${key}`);
    return this.plugin.settings[key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isSettingKey(key)) throw new Error(`Unknown setting key: ${key}`);
    switch (key) {
      case 'supabaseUrl':
      case 'supabaseAnonKey':
      case 'email':
      case 'password':
      case 'dashboardPath':
        if (typeof value !== 'string') throw new TypeError(`Invalid value for ${key}`);
        this.plugin.settings[key] = value;
        break;
      case 'syncMode':
        if (value !== 'area' && value !== 'individual') throw new TypeError(`Invalid value for ${key}`);
        this.plugin.settings.syncMode = value;
        break;
      case 'autoSyncToday':
        if (typeof value !== 'boolean') throw new TypeError(`Invalid value for ${key}`);
        this.plugin.settings.autoSyncToday = value;
        break;
      case 'defaultDuration':
      case 'defaultEnergyCost':
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`Invalid value for ${key}`);
        this.plugin.settings[key] = value;
        break;
    }
    await this.plugin.saveSettings();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName('Configuration').setHeading();
    this.textSetting(containerEl, 'Supabase URL', 'supabaseUrl');
    this.textSetting(containerEl, 'Supabase anon key', 'supabaseAnonKey');
    this.textSetting(containerEl, 'Email', 'email');
    this.textSetting(containerEl, 'Password', 'password');
    this.textSetting(containerEl, 'Dashboard path', 'dashboardPath');
    new Setting(containerEl)
      .setName('Connection')
      .setDesc('Usa tu cuenta existente de InnerLevel. No crea usuarios nuevos.')
      .addButton(button => button.setButtonText('Sign in / test').setCta().onClick(() => this.plugin.testConnection()));
    new Setting(containerEl)
      .setName('Modo de sincronización / Sync Mode')
      .setDesc('Elige si deseas crear una carta por cada nota individual o agrupar por área mostrando el tiempo total acumulado.')
      .addDropdown(dropdown => dropdown
        .addOption('area', 'Por Área / By Area (cartas agrupadas con tiempo total)')
        .addOption('individual', 'Individual (una carta por nota)')
        .setValue(this.plugin.settings.syncMode || 'area')
        .onChange(async (value) => {
          this.plugin.settings.syncMode = value as SyncMode;
          await this.plugin.saveSettings();
        })
      );
    new Setting(containerEl).setName('Automatic daily sync').setDesc('Sincroniza una vez al abrir Obsidian, después de cargar el vault.').addToggle(toggle => toggle.setValue(this.plugin.settings.autoSyncToday).onChange(async value => { this.plugin.settings.autoSyncToday = value; await this.plugin.saveSettings(); }));
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

const SETTING_KEYS = [
  'supabaseUrl', 'supabaseAnonKey', 'email', 'password', 'defaultDuration',
  'defaultEnergyCost', 'dashboardPath', 'autoSyncToday', 'syncMode',
] as const;

function isSettingKey(key: string): key is typeof SETTING_KEYS[number] {
  return (SETTING_KEYS as readonly string[]).includes(key);
}

function isoToday(): string { return new Date().toISOString().slice(0, 10); }
function authStorageKey(url: string): string {
  const ref = url.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  return `sb_sb-${ref}-auth-token`;
}
function stableId(path: string): string { return path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function slug(value: string): string { return stableId(value); }
function firstMeaningfulParagraph(body: string): string { return body.split(/\n\s*\n/).map(part => part.replace(/^#+\s*/, '').trim()).find(Boolean)?.slice(0, 500) || ''; }

// Multi-language (English + Spanish) Frontmatter Extractors
function getFMValue(frontmatter: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = frontmatter[key];
    if (val !== undefined && val !== null && val !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function getNoteType(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'note_type', 'tipo_nota', 'type', 'tipo');
}

function getDueDate(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'due_date', 'next_review', 'due', 'proxima-revision', 'proxima_revision', 'proxima_review');
}

function getArea(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'area', 'topic', 'subject');
}

function getStatus(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'status', 'state', 'estado');
}

function getComprehension(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'understanding_level', 'comprehension_level', 'understanding', 'comprehension', 'nivel-comprension', 'nivel_comprension');
}

function getReviewTime(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'review_time', 'estimated_time', 'duration', 'tiempo-repaso', 'tiempo_repaso', 'tiempo-estimado', 'tiempo_estimado');
}

function getReviewResult(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'review_result', 'result', 'resultado-repaso', 'resultado_repaso');
}

function getPriority(frontmatter: Record<string, unknown>): string {
  return getFMValue(frontmatter, 'priority', 'prioridad');
}

function isDue(frontmatter: Record<string, unknown>, today: string): boolean {
  const type = getNoteType(frontmatter);
  const due = getDueDate(frontmatter);
  const level = getComprehension(frontmatter).toUpperCase();
  const status = getStatus(frontmatter).toLowerCase();
  const area = getArea(frontmatter);

  const isArchived = status === '🎉 completado / archivado' || status === 'archived' || status === 'completed' || status === 'archivado';
  const isCompleted = level === 'COMPLETADO' || level === 'COMPLETED';

  return DUE_TYPES.has(type) && Boolean(area) && due !== '' && due <= today && !isArchived && !isCompleted;
}

function dueDescription(file: TFile, frontmatter: Record<string, unknown>, body: string): string {
  const area = getArea(frontmatter);
  const level = getComprehension(frontmatter) || 'pendiente';
  const time = getReviewTime(frontmatter) || 'sin estimar';
  return [
    `Area: ${area}`,
    `Comprension: ${level}`,
    `Tiempo: ${time}`,
    `Obsidian: obsidian://open?vault=${encodeURIComponent(file.vault.getName())}&file=${encodeURIComponent(file.path)}`,
    '',
    firstMeaningfulParagraph(body)
  ].join('\n').slice(0, 1500);
}

function timingFor(value: string, settings: InnerLevelSettings): { duration: number; energyCost: number } {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  const minutes = normalized.match(/^\+?(\d+(?:\.\d+)?)m(?:in(?:utos)?)?$/);
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

function priorityFor(frontmatter: Record<string, unknown>): number {
  const priority = getPriority(frontmatter).toLowerCase();
  const level = getComprehension(frontmatter).toLowerCase();
  const result = getReviewResult(frontmatter).toLowerCase();
  const value = `${priority} ${level} ${result}`;

  if (/❓|🤔|fallado|failed|dificil|difícil|difficult|hard/.test(value)) return 4;
  if (/alta|alto|high/.test(value)) return 4;
  if (/baja|bajo|low/.test(value)) return 2;
  return 3;
}

function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function energyCostForDuration(durationHours: number, settings: InnerLevelSettings): number {
  if (durationHours <= 5 / 60) return 10;
  if (durationHours <= 15 / 60) return 15;
  if (durationHours <= 30 / 60) return 20;
  if (durationHours <= 60 / 60) return 25;
  if (durationHours <= 120 / 60) return 35;
  return 50;
}