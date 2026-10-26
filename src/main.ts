import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SettingDefinitionItem, TFile, addIcon, Menu } from 'obsidian';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { detectLanguage, getTranslations, Language, TranslationDict } from './i18n';
import { ScheduleReviewModal } from './modals/ScheduleReviewModal';
import { BatchScheduleModal } from './modals/BatchScheduleModal';

const INNERLEVEL_ICON_SVG = `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <g style="stroke: none; shape-rendering: crispEdges;" stroke="none">
    <!-- Peak Silhouette & Base Outline (uses currentColor to match theme and hover) -->
    <path fill="currentColor" stroke="none" d="M7 1h1v1h-1Z M6 2h1v1h-1Z M8 2h1v1h-1Z M5 3h1v1h-1Z M9 3h1v1h-1Z M4 4h1v1h-1Z M10 4h1v1h-1Z M3 5h1v1h-1Z M11 5h1v1h-1Z M2 6h1v1h-1Z M12 6h1v1h-1Z M1 7h1v1h-1Z M13 7h1v1h-1Z M1 8h1v1h-1Z M14 8h1v1h-1Z M0 9h1v1h-1Z M14 9h2v1h-2Z M0 10h1v4h-1Z M15 10h1v4h-1Z M0 14h16v1h-16Z" />
    <!-- Snowy Peak Summit & Ridge -->
    <path fill="#FFFFFF" stroke="none" d="M7 2h1v1h-1Z M6 3h3v1h-3Z M5 4h5v1h-5Z M4 5h7v1h-7Z M3 6h9v1h-9Z M4 7h7v1h-7Z M6 8h5v1h-5Z M7 9h3v1h-3Z M8 10h1v4h-1Z" />
    <!-- Left Slope (Light Cozy Emerald) -->
    <path fill="#34D399" stroke="none" d="M2 7h2v1h-2Z M2 8h4v1h-4Z M1 9h6v1h-6Z M1 10h7v4h-7Z" />
    <!-- Right Slope (Deep Forest Emerald) -->
    <path fill="#047857" stroke="none" d="M11 7h2v1h-2Z M11 8h3v1h-3Z M10 9h4v1h-4Z M9 10h6v4h-6Z" />
  </g>
</svg>
`;

export type SyncMode = 'individual' | 'area';

export interface InnerLevelSettings {
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
  language: Language;
  defaultNoteType: string;
}

const DEFAULT_SETTINGS: InnerLevelSettings = {
  supabaseUrl: '', supabaseAnonKey: '', email: '', password: '',
  defaultDuration: 0.5, defaultEnergyCost: 15, dashboardPath: 'Dashboard_General.md',
  autoSyncToday: false,
  syncMode: 'area',
  language: 'auto',
  defaultNoteType: 'tecnica',
};

const DUE_TYPES = new Set([
  // Spanish
  'tecnica', 'nota_estudio', 'captura_rapida', 'permanente', 'problema', 'clase', 'trabajo',
  // English
  'technical', 'study_note', 'quick_capture', 'permanent', 'problem', 'class', 'work'
]);

export default class InnerLevelSyncPlugin extends Plugin {
  settings!: InnerLevelSettings;
  private client: SupabaseClient | null = null;

  getLang(): 'en' | 'es' {
    return detectLanguage(this.settings?.language || 'auto');
  }

  get t(): TranslationDict {
    return getTranslations(this.getLang());
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new InnerLevelSettingTab(this.app, this));

    // Register custom InnerLevel mountain icon (matching InnerLevel favicon)
    addIcon('innerlevel-peak', INNERLEVEL_ICON_SVG);
    addIcon('innerlevel-crystal', INNERLEVEL_ICON_SVG);

    const t = this.t;

    // Sidebar Ribbon Icon
    const ribbonIconEl = this.addRibbonIcon('innerlevel-peak', t.ribbonTooltip, (_evt: MouseEvent) => {
      void this.syncDueNotes();
    });
    ribbonIconEl.addClass('innerlevel-sync-ribbon-icon');

    // Right-click context menu on sidebar ribbon icon
    ribbonIconEl.addEventListener('contextmenu', (evt: MouseEvent) => {
      evt.preventDefault();
      const menu = new Menu();
      const currentT = this.t;

      menu.addItem((item) =>
        item
          .setTitle(currentT.ribbonSyncDue)
          .setIcon('refresh-cw')
          .onClick(() => { void this.syncDueNotes(); })
      );

      menu.addItem((item) =>
        item
          .setTitle(currentT.ribbonSyncDueArea)
          .setIcon('folder')
          .onClick(() => { void this.syncDueNotes(false, 'area'); })
      );

      menu.addItem((item) =>
        item
          .setTitle(currentT.ribbonSyncDueIndividual)
          .setIcon('file-text')
          .onClick(() => { void this.syncDueNotes(false, 'individual'); })
      );

      menu.addItem((item) =>
        item
          .setTitle(currentT.ribbonResyncDue)
          .setIcon('rotate-ccw')
          .onClick(() => { void this.syncDueNotes(true); })
      );

      menu.addSeparator();

      menu.addItem((item) =>
        item
          .setTitle(currentT.ribbonCaptureCurrent)
          .setIcon('file-plus')
          .onClick(() => { void this.captureCurrentNote(); })
      );

      menu.addItem((item) =>
        item
          .setTitle(currentT.ribbonOpenInnerLevel)
          .setIcon('external-link')
          .onClick(() => { window.open('https://inner-level-app.vercel.app/', '_blank'); })
      );

      menu.showAtMouseEvent(evt);
    });

    // 1. Registered Commands
    this.addCommand({
      id: 'schedule-review-current',
      name: t.cmdScheduleReview,
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view && view.file) {
          if (!checking) {
            this.openScheduleModal(view.file);
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'enable-review-today-current',
      name: t.cmdEnableReviewToday,
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view && view.file) {
          if (!checking) {
            void this.addDefaultReviewMetadata(view.file);
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({ id: 'capture-current-note', name: t.cmdCaptureCurrent, callback: () => this.captureCurrentNote() });
    this.addCommand({ id: 'sync-due-today', name: t.cmdSyncDue, callback: () => this.syncDueNotes() });
    this.addCommand({ id: 'sync-due-today-area', name: t.cmdSyncDueArea, callback: () => this.syncDueNotes(false, 'area') });
    this.addCommand({ id: 'sync-due-today-individual', name: t.cmdSyncDueIndividual, callback: () => this.syncDueNotes(false, 'individual') });
    this.addCommand({ id: 'resync-due-today', name: t.cmdResyncDue, callback: () => this.syncDueNotes(true) });
    this.addCommand({ id: 'open-innerlevel', name: t.cmdOpenInnerLevel, callback: () => window.open('https://inner-level-app.vercel.app/', '_blank') });

    // 2. Context Menu on individual file (File Explorer & More options)
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          const currentT = this.t;
          menu.addSeparator();
          menu.addItem((item) => {
            item
              .setTitle(currentT.menuScheduleReview)
              .setIcon('calendar-plus')
              .onClick(() => this.openScheduleModal(file));
          });
          menu.addItem((item) => {
            item
              .setTitle(currentT.menuAddReviewToday)
              .setIcon('innerlevel-peak')
              .onClick(() => { void this.addDefaultReviewMetadata(file); });
          });
        }
      })
    );

    // 3. Context Menu on multiple files (Batch selection in File Explorer)
    this.registerEvent(
      this.app.workspace.on('files-menu', (menu, files) => {
        const mdFiles = files.filter((f): f is TFile => f instanceof TFile && f.extension === 'md');
        if (mdFiles.length > 1) {
          const currentT = this.t;
          menu.addSeparator();
          menu.addItem((item) => {
            item
              .setTitle(currentT.menuBatchReview(mdFiles.length))
              .setIcon('calendar-plus')
              .onClick(() => this.openBatchScheduleModal(mdFiles));
          });
        }
      })
    );

    // 4. Editor Context Menu (Right-click inside active note)
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, _editor, view) => {
        if (view.file) {
          const file = view.file;
          const currentT = this.t;
          menu.addSeparator();
          menu.addItem((item) => {
            item
              .setTitle(currentT.menuScheduleReview)
              .setIcon('calendar-plus')
              .onClick(() => this.openScheduleModal(file));
          });
          menu.addItem((item) => {
            item
              .setTitle(currentT.menuAddReviewToday)
              .setIcon('innerlevel-peak')
              .onClick(() => { void this.addDefaultReviewMetadata(file); });
          });
        }
      })
    );

    this.app.workspace.onLayoutReady(() => { void this.syncAutomatically(); });
  }

  onunload(): void {
    this.client = null;
  }

  openScheduleModal(file: TFile): void {
    new ScheduleReviewModal(this.app, this, file).open();
  }

  openBatchScheduleModal(files: TFile[]): void {
    new BatchScheduleModal(this.app, this, files).open();
  }

  async applyReviewMetadata(
    file: TFile,
    metadata: {
      date: string;
      duration: string;
      area: string;
      noteType: string;
      level: string;
    },
    lang: 'en' | 'es'
  ): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (rawFm) => {
      const fm = rawFm as Record<string, unknown>;
      // 1. Date key: preserve existing key if present, otherwise follow language convention
      if ('due_date' in fm) fm['due_date'] = metadata.date;
      else if ('proxima-revision' in fm) fm['proxima-revision'] = metadata.date;
      else if ('proxima_revision' in fm) fm['proxima_revision'] = metadata.date;
      else if ('due' in fm) fm['due'] = metadata.date;
      else {
        const key = lang === 'es' ? 'proxima-revision' : 'due_date';
        fm[key] = metadata.date;
      }

      // 2. Note type key
      if ('note_type' in fm) fm['note_type'] = metadata.noteType;
      else if ('tipo_nota' in fm) fm['tipo_nota'] = metadata.noteType;
      else if ('type' in fm) fm['type'] = metadata.noteType;
      else if ('tipo' in fm) fm['tipo'] = metadata.noteType;
      else {
        const key = lang === 'es' ? 'tipo_nota' : 'note_type';
        fm[key] = metadata.noteType;
      }

      // 3. Area key
      if ('area' in fm) fm['area'] = metadata.area;
      else if ('cards-deck' in fm) fm['cards-deck'] = metadata.area;
      else if ('deck' in fm) fm['deck'] = metadata.area;
      else if ('topic' in fm) fm['topic'] = metadata.area;
      else {
        fm['area'] = metadata.area;
      }

      // 4. Duration key
      if ('review_time' in fm) fm['review_time'] = metadata.duration;
      else if ('tiempo-repaso' in fm) fm['tiempo-repaso'] = metadata.duration;
      else if ('duration' in fm) fm['duration'] = metadata.duration;
      else {
        const key = lang === 'es' ? 'tiempo-repaso' : 'review_time';
        fm[key] = metadata.duration;
      }

      // 5. Comprehension / Understanding Level key
      if ('understanding_level' in fm) fm['understanding_level'] = metadata.level;
      else if ('nivel-comprension' in fm) fm['nivel-comprension'] = metadata.level;
      else if ('comprehension' in fm) fm['comprehension'] = metadata.level;
      else {
        const key = lang === 'es' ? 'nivel-comprension' : 'understanding_level';
        fm[key] = metadata.level;
      }
    });

    new Notice(this.t.noticeReviewScheduled(file.basename, metadata.date));
  }

  async addDefaultReviewMetadata(file: TFile): Promise<void> {
    const lang = this.getLang();
    const fm = (this.app.metadataCache.getFileCache(file)?.frontmatter || {}) as Record<string, unknown>;
    const area = getArea(fm, file) || 'General';
    const mins = Math.round((this.settings.defaultDuration || 0.5) * 60);
    const duration = `${mins}m`;
    const defaultType = this.settings.defaultNoteType || (lang === 'es' ? 'tecnica' : 'technical');
    const today = isoToday();

    await this.applyReviewMetadata(
      file,
      {
        date: today,
        duration,
        area,
        noteType: defaultType,
        level: 'pendiente',
      },
      lang
    );
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
      this.client = createClient(this.settings.supabaseUrl, this.settings.supabaseAnonKey, {
        auth: {
          storage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          lock: async <R>(_name: string, _acquireTimeout: number, fn: (lock: unknown) => Promise<R>): Promise<R> => await fn(null),
        },
      });
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
      new Notice(this.t.noticeConnectionOk);
    } catch (error) {
      this.reportError(error);
    }
  }

  private async captureCurrentNote(): Promise<void> {
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) throw new Error(this.t.noticeNoMarkdownOpen);
      const file = view.file;
      if (!file) throw new Error(this.t.noticeNoMarkdownOpen);
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const selection = view.editor.getSelection().trim();
      const description = selection || firstMeaningfulParagraph(view.editor.getValue()) || file.basename;
      const card = this.makeCard(`obsidian-capture-${stableId(file.path)}-${Date.now()}`, file.basename, description, frontmatter, ['obsidian', 'quick-seed'], file);
      const { error } = await (await this.ensureSession()).rpc('append_obsidian_card', { p_card: card });
      if (error) throw error;
      new Notice(this.t.noticeCaptured(file.basename));
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

  async syncDueNotes(force = false, modeOverride?: SyncMode): Promise<boolean> {
    try {
      const client = await this.ensureSession();
      const today = isoToday();
      const mode = modeOverride || this.settings.syncMode || 'area';
      const dueNotes = this.app.vault.getMarkdownFiles().filter(file => {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        return isDue(frontmatter, today, file);
      });

      if (dueNotes.length === 0) {
        new Notice(this.t.noticeNoDueNotes);
        return true;
      }

      // Check which cards already exist in remote Supabase user_data.cards
      let existingRemoteCardIds = new Set<string>();
      try {
        const { data: { session } } = await client.auth.getSession();
        const user = session?.user;
        if (user) {
          interface RemoteUserData {
            cards?: {
              inventory?: Array<{ id?: string }>;
            };
          }
          const { data } = await client
            .from('user_data')
            .select('cards')
            .eq('user_id', user.id)
            .maybeSingle();
          const userData = data as RemoteUserData | null;
          const inventory = userData?.cards?.inventory;
          if (Array.isArray(inventory)) {
            const ids: string[] = [];
            for (const item of inventory) {
              if (item && typeof item.id === 'string') {
                ids.push(item.id);
              }
            }
            existingRemoteCardIds = new Set(ids);
          }
        }
      } catch (checkErr) {
        console.warn('[InnerLevel Sync] Could not check remote cards in Supabase:', checkErr);
      }

      const notesToSync: { file: TFile; frontmatter: Record<string, unknown>; body: string }[] = [];
      for (const file of dueNotes) {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        const areaName = getArea(frontmatter, file) || 'General';
        const expectedCardId = mode === 'area'
          ? `obsidian-area-${slug(areaName)}-${today}`
          : `obsidian-${stableId(file.path)}-${today}`;

        // If force is false, and frontmatter says it was synced today,
        // ONLY skip if the card is ACTUALLY present in Supabase remote inventory!
        // If it's missing in Supabase, self-heal and re-push it!
        const isPresentInRemote = existingRemoteCardIds.has(expectedCardId);
        if (!force && frontmatter.innerlevel_last_sync === today && isPresentInRemote) {
          continue;
        }

        const body = await this.app.vault.read(file);
        notesToSync.push({ file, frontmatter, body });
      }

      if (notesToSync.length === 0) {
        new Notice(this.t.noticeNotesAlreadySynced(dueNotes.length));
        return true;
      }

      let syncedCount = 0;

      if (mode === 'area') {
        const areaGroups = new Map<string, { file: TFile; frontmatter: Record<string, unknown>; body: string }[]>();
        for (const item of notesToSync) {
          const areaName = getArea(item.frontmatter, item.file) || 'Sin Área';
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

        new Notice(this.t.noticeSyncSuccess(syncedCount, areaGroups.size));
      } else {
        for (const item of notesToSync) {
          const card = this.makeCard(`obsidian-${stableId(item.file.path)}-${today}`, item.file.basename, dueDescription(item.file, item.frontmatter, item.body), item.frontmatter, ['obsidian', 'srs', 'due-today'], item.file);
          const { error } = await client.rpc('append_obsidian_card', { p_card: card });
          if (error) throw error;
          await this.markSynced(item.file, card.id, today);
          syncedCount += 1;
        }
        new Notice(this.t.noticeSyncSuccessIndividual(syncedCount));
      }

      return true;
    } catch (error) { this.reportError(error); return false; }
  }

  private makeCard(id: string, name: string, description: string, frontmatter: Record<string, unknown>, baseTags: string[], file?: TFile): { id: string; [key: string]: unknown } {
    const timing = timingFor(getReviewTime(frontmatter), this.settings);
    const area = getArea(frontmatter, file);
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
      case 'defaultNoteType':
        if (typeof value !== 'string') throw new TypeError(`Invalid value for ${key}`);
        this.plugin.settings[key] = value;
        break;
      case 'language':
        if (value !== 'auto' && value !== 'en' && value !== 'es') throw new TypeError(`Invalid value for ${key}`);
        this.plugin.settings.language = value;
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
    this.renderSettings();
  }

  private renderSettings(): void {
    const { containerEl } = this;
    containerEl.empty();
    const t = this.plugin.t;

    new Setting(containerEl).setName(t.settingHeadingConfig).setHeading();
    this.textSetting(containerEl, 'Supabase URL', 'supabaseUrl');
    this.textSetting(containerEl, 'Supabase anon key', 'supabaseAnonKey');
    this.textSetting(containerEl, 'Email', 'email');
    this.textSetting(containerEl, 'Password', 'password');
    this.textSetting(containerEl, 'Dashboard path', 'dashboardPath');

    new Setting(containerEl)
      .setName(t.settingConnectionBtn)
      .setDesc(t.settingConnectionDesc)
      .addButton(button => button.setButtonText(t.settingConnectionBtn).setCta().onClick(() => this.plugin.testConnection()));

    // Language setting
    new Setting(containerEl)
      .setName(t.settingLanguage)
      .setDesc(t.settingLanguageDesc)
      .addDropdown(dropdown => dropdown
        .addOption('auto', t.settingLanguageAuto)
        .addOption('en', 'English')
        .addOption('es', 'Español')
        .setValue(this.plugin.settings.language || 'auto')
        .onChange(async (val) => {
          this.plugin.settings.language = val as Language;
          await this.plugin.saveSettings();
          this.renderSettings(); // re-render setting tab with new language
        })
      );

    new Setting(containerEl).setName(t.settingHeadingDefaults).setHeading();

    new Setting(containerEl)
      .setName(t.settingSyncMode)
      .setDesc(t.settingSyncModeDesc)
      .addDropdown(dropdown => dropdown
        .addOption('area', t.settingSyncModeArea)
        .addOption('individual', t.settingSyncModeIndividual)
        .setValue(this.plugin.settings.syncMode || 'area')
        .onChange(async (value) => {
          this.plugin.settings.syncMode = value as SyncMode;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t.settingAutoSync)
      .setDesc(t.settingAutoSyncDesc)
      .addToggle(toggle => toggle.setValue(this.plugin.settings.autoSyncToday).onChange(async value => {
        this.plugin.settings.autoSyncToday = value;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName(t.settingDefaultDuration)
      .setDesc(t.settingDefaultDurationDesc)
      .addText(text => text.setValue(String(this.plugin.settings.defaultDuration)).onChange(async value => {
        this.plugin.settings.defaultDuration = Number(value) || DEFAULT_SETTINGS.defaultDuration;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName(t.settingDefaultEnergy)
      .setDesc(t.settingDefaultEnergyDesc)
      .addText(text => text.setValue(String(this.plugin.settings.defaultEnergyCost)).onChange(async value => {
        this.plugin.settings.defaultEnergyCost = Number(value) || DEFAULT_SETTINGS.defaultEnergyCost;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName(t.settingDefaultType)
      .setDesc(t.settingDefaultTypeDesc)
      .addDropdown(dropdown => dropdown
        .addOption('tecnica', 'Técnica / technical')
        .addOption('nota_estudio', 'Nota de estudio / study note')
        .addOption('captura_rapida', 'Captura rápida / quick capture')
        .addOption('clase', 'Clase / class')
        .addOption('problema', 'Problema / problem')
        .addOption('permanente', 'Permanente / permanent')
        .setValue(this.plugin.settings.defaultNoteType || 'tecnica')
        .onChange(async (value) => {
          this.plugin.settings.defaultNoteType = value;
          await this.plugin.saveSettings();
        })
      );
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
  'language', 'defaultNoteType',
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
    if (typeof val === 'string' || typeof val === 'number') {
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

function getArea(frontmatter: Record<string, unknown>, file?: TFile): string {
  const explicit = getFMValue(frontmatter, 'area', 'topic', 'subject', 'cards-deck', 'cards_deck', 'deck', 'category', 'categoria');
  if (explicit) return explicit;
  if (file && file.parent && file.parent.name && file.parent.name !== '/') {
    return file.parent.name;
  }
  return 'General';
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

function normalizeType(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function matchesDueType(rawType: string): boolean {
  if (!rawType) return false;
  const normalized = normalizeType(rawType);
  if (DUE_TYPES.has(normalized)) return true;
  return /tecnic|estudio|captura|permanente|problem|clas|trabaj|technic|study|quick/.test(normalized);
}

function isDue(frontmatter: Record<string, unknown>, today: string, file?: TFile): boolean {
  const type = getNoteType(frontmatter);
  const due = getDueDate(frontmatter);
  const level = getComprehension(frontmatter).toUpperCase();
  const status = getStatus(frontmatter).toLowerCase();
  const area = getArea(frontmatter, file);

  const isArchived = status === '🎉 completado / archivado' || status === 'archived' || status === 'completed' || status === 'archivado';
  const isCompleted = level === 'COMPLETADO' || level === 'COMPLETED';

  if (isArchived || isCompleted) return false;

  // Must have a valid review date that is not a template placeholder (<% ...)
  const hasValidDueDate = Boolean(due && due <= today && !due.includes('<%'));
  if (!hasValidDueDate) return false;

  const hasType = matchesDueType(type);
  const hasAreaOrFolder = Boolean(area);

  return hasType || hasAreaOrFolder;
}

function dueDescription(file: TFile, frontmatter: Record<string, unknown>, body: string): string {
  const area = getArea(frontmatter, file);
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
