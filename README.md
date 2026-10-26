# InnerLevel Sync

**InnerLevel Sync** is an Obsidian plugin that seamlessly integrates your Obsidian vault notes and Spaced Repetition System (SRS) with the **InnerLevel** gamified productivity app.

It automatically extracts your daily due study notes and quick captures from Obsidian and syncs them to InnerLevel as gamified action cards with estimated durations, energy costs, priority ratings, and deep links back to your vault.

---

## ✨ Features

- **📅 Interactive Review Scheduler Modal**: No more typing or copying and pasting YAML frontmatter! Right-click any note or run the command to open a visual modal with quick-date pills (`Today`, `Tomorrow`, `+3 Days`, `+1 Week`, `+2 Weeks`), duration selectors (`5m`, `15m`, `30m`, `45m`, `1h`), area detection, and a 1-click **"Save & Sync"** button.
- **📚 Batch Multi-Note Scheduling**: Select multiple notes in the Obsidian File Explorer, right-click, and configure review dates, durations, and note types for dozens of study notes all at once.
- **🌐 Automatic Bilingual Interface (English & Spanish)**: Commands, modals, ribbon menus, settings, and notices automatically match your Obsidian UI language, with a manual override in settings.
- **🛡️ Resilient Self-Healing Sync**: The plugin checks your remote InnerLevel card inventory before skipping notes. If a card was deleted or missing, it self-heals and re-synchronizes automatically.
- **📁 Universal SRS & Folder Fallbacks**: Detects notes using properties from popular community plugins like *Spaced Repetition* (`cards-deck`, `deck`), Dataview fields (`category`, `topic`, `subject`), or simply your vault's folder organization if no area tag is set.
- **💎 Sidebar Ribbon Quick-Action**: Click the InnerLevel peak icon on the Obsidian left sidebar (ribbon) to immediately sync today's due notes, or right-click to open a context menu with all sync, capture, and app actions.
- **📊 Dual Sync Modes**:
  - **By Area (`area`)**: Groups all due notes for a given topic/area into a single summary action card. Displays the **total cumulative study time** required for that area, lists all individual notes with their level of understanding, and provides direct `obsidian://open` deep links.
  - **Individual (`individual`)**: Creates a distinct action card in InnerLevel for every single due note.
- **⚡ Quick Selection/Note Capture**: Capture the currently selected text or note into InnerLevel instantly as a quick seed action card.
- **⏰ Automatic Daily Sync**: Option to automatically sync due SRS notes once per day when Obsidian opens.
- **🔄 Atomic Frontmatter Management**: Uses Obsidian's official `app.fileManager.processFrontMatter` API to safely update YAML metadata without corrupting markdown content or comments.

---

## ⚙️ Configuration & Setup

1. Install and enable **InnerLevel Sync** in Obsidian Settings (via Community Plugins or BRAT).
2. Navigate to **Obsidian Settings > InnerLevel Sync**.
3. Configure your **InnerLevel** connection details:
   - **Supabase URL**: Your InnerLevel Supabase project URL (`https://<your-project>.supabase.co`).
   - **Supabase Anon Key**: Your InnerLevel project public anon key.
   - **Email & Password**: Your existing InnerLevel account credentials.
4. Click **Test Connection / Probar Conexión** to verify connectivity.
5. *(Optional)* Customize your preferences:
   - **Plugin Language**: Follow Obsidian (`Auto`), `English`, or `Español`.
   - **Sync Mode**: *By Area / Por Área* (grouped cards) or *Individual*.
   - **Default Note Type & Duration**: Choose defaults for 1-click review scheduling.
   - **Automatic Daily Sync**: Enable background sync on startup.

---

## 🚀 How to Schedule Notes for Review

You **do not** need to write or copy-paste YAML manually. You can schedule notes in three easy ways:

### 1. Interactive Visual Modal (Recommended)
- Right-click anywhere inside an open note or in the File Explorer and select **`InnerLevel: Schedule review...`** (or press `Ctrl/Cmd + P` and search for *Schedule review*).
- Choose your review date using quick buttons (`Today`, `Tomorrow`, `+3 Days`, `+1 Week`, `+2 Weeks`) or a date picker.
- Select your estimated duration (`5m`, `15m`, `30m`, `45m`, `1h`) and note type.
- Click **Save & Sync to InnerLevel** to update the note and forge the card immediately.

### 2. One-Click Quick Enable for Today
- Right-click any note and click **`InnerLevel: Enable review for today`**.
- The plugin automatically injects the default study frontmatter (in your configured language) and sets the review date to today.

### 3. Batch Scheduling Multiple Notes
- In the Obsidian File Explorer, hold `Shift` or `Ctrl/Cmd` to select multiple notes.
- Right-click and choose **`InnerLevel: Schedule review for X notes...`**.
- Configure the schedule once; it will apply to all selected notes while automatically preserving each note's folder name as its area.

---

## 📝 Frontmatter Reference (Bilingual Support)

If you prefer editing or templating frontmatter directly, the plugin supports both **English** and **Spanish** property names out of the box:

| Property Concept | English Keys | Spanish Keys | Example Values |
| :--- | :--- | :--- | :--- |
| **Due Date** | `due_date`, `next_review`, `due` | `proxima-revision`, `proxima_revision` | `2026-10-26` (YYYY-MM-DD) |
| **Note Type** | `note_type`, `type` | `tipo_nota`, `tipo` | `technical` / `tecnica`, `study_note` / `nota_estudio`, `quick_capture` / `captura_rapida`, `class` / `clase`, `problem` / `problema` |
| **Area / Topic** | `area`, `cards-deck`, `deck`, `topic`, `subject` | `area`, `categoria` | `Cloud`, `Machine Learning`, `Data Science` *(defaults to folder)* |
| **Review Time** | `review_time`, `duration`, `estimated_time` | `tiempo-repaso`, `tiempo-estimado` | `5m`, `15min`, `30m`, `1h` |
| **Comprehension** | `understanding_level`, `comprehension` | `nivel-comprension` | `pending` / `pendiente`, `difficult` / `dificil`, `good` / `bien`, `mastered` / `completado` |
| **Priority** | `priority` | `prioridad` | `high` / `alta`, `medium` / `media`, `low` / `baja` |
| **Status** | `status`, `state` | `status`, `estado` | `active`, `archived` / `🎉 completado / archivado` |

### Sample English Frontmatter

```yaml
---
note_type: technical
area: Cloud Infrastructure
due_date: 2026-10-26
review_time: 15m
understanding_level: pending
priority: high
---
```

### Sample Spanish Frontmatter

```yaml
---
tipo_nota: tecnica
area: Infraestructura-Nube
proxima-revision: 2026-10-26
tiempo-repaso: 15m
nivel-comprension: pendiente
prioridad: alta
---
```

---

## 🕹️ Command Palette (`Ctrl/Cmd + P`)

- **InnerLevel: Schedule review for current note**: Opens the interactive review scheduling modal.
- **InnerLevel: Enable review for today (1-click)**: Instantly marks the current note for review today with default settings.
- **InnerLevel: Sync today's due notes**: Syncs notes due today according to your default sync mode setting.
- **InnerLevel: Sync today's due notes (by area)**: Groups due notes into topic summary cards with cumulative time.
- **InnerLevel: Sync today's due notes (individual)**: Creates an individual action card for each due note.
- **InnerLevel: Resync today's due notes (force)**: Forces a full resynchronization even if notes were already marked as synced today.
- **InnerLevel: Capture selection / current note**: Captures active text or the whole note as a quick seed action card.
- **InnerLevel: Open InnerLevel**: Launches the InnerLevel web app in your default browser.

---

## 🌐 Network & Vault Access Disclosures

### External Network Requests
This plugin makes network requests only to necessary, user-configured external endpoints:

1. **`https://inner-level-app.vercel.app`**:
   - **Purpose**: Opens the official InnerLevel web application in your default web browser.
   - **Trigger**: Opened only when you explicitly invoke the **"Open InnerLevel"** action.
2. **User-configured Supabase Backend (`https://<your-project>.supabase.co`)**:
   - **Purpose**: Authenticates your InnerLevel account using email/password and syncs forged action cards generated from your Obsidian study notes into your InnerLevel card database via Supabase RPC (`append_obsidian_card`).
   - **Data Sent**: Card title, summary description (or note excerpt), calculated study duration, energy cost, priority, SRS tags, and `obsidian://open` deep links pointing back to your local note.
   - **Trigger**: Executed only when you run a sync command, click **"Test Connection"** in settings, or when **Automatic daily sync** is enabled.

### Vault Access & File Enumeration
- **`vault.getMarkdownFiles()` Rationale**: The plugin scans the frontmatter of markdown files in your vault to check for SRS review metadata fields (`due_date`, `proxima-revision`, `note_type`, etc.) to determine which study notes are due for review today (`due_date <= today`).
- **File Content Access**: Note text is read locally to extract brief excerpts for action card descriptions and to calculate review duration. Note contents are never uploaded or shared anywhere other than the card title and description sent to your private InnerLevel account.
- **Atomic Modification**: Frontmatter changes are written using Obsidian's native `app.fileManager.processFrontMatter` API, which safely preserves your existing note content and formatting.
- **Data Storage**: All plugin settings and authentication tokens are persisted strictly through Obsidian's native plugin storage APIs (`this.loadData()` and `this.saveData()`). No browser `localStorage` or `sessionStorage` APIs are used.

---

## 🛠️ Development & Building

To build the plugin locally:

```bash
# Install dependencies
npm install

# Build production bundle
npm run build
```

This compiles TypeScript and bundles everything into `main.js`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
