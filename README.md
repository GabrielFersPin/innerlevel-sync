# InnerLevel Sync

**InnerLevel Sync** is an Obsidian plugin that seamlessly integrates your Obsidian vault notes and Spaced Repetition System (SRS) with the **InnerLevel** gamified productivity app.

It automatically extracts your daily due study notes and quick captures from Obsidian and syncs them to InnerLevel as gamified action cards with estimated durations, energy costs, priority ratings, and deep links back to your vault.

---

## ✨ Features

- **Sidebar Ribbon Quick-Action**: Click the InnerLevel crystal icon on the Obsidian left sidebar (ribbon) to immediately sync today's due notes, or right-click to open a context menu with all sync, capture, and app actions.
- **Bilingual Frontmatter Support**: Out-of-the-box support for both **English and Spanish** frontmatter keys and values. Keep your existing Spanish notes while offering full English compatibility for the community!
- **Dual Sync Modes**:
  - **By Area (`area`)**: Groups all due notes for a given topic/area into a single summary action card. Displays the **total cumulative study time** required for that area, lists all individual notes with their level of understanding, and provides direct `obsidian://open` deep links.
  - **Individual (`individual`)**: Creates a distinct action card in InnerLevel for every single due note.
- **Automatic Daily Sync**: Option to automatically sync due SRS notes once per day when Obsidian opens.
- **Quick Selection/Note Capture**: Capture the currently selected text or note into InnerLevel instantly.
- **Automatic Sync Tracking**: Updates frontmatter with `innerlevel_last_sync` and `innerlevel_card_id` to prevent duplicate daily syncs.

---

## 🌐 Network & Vault Access Disclosures

### External Network Requests
This plugin makes network requests only to necessary, user-configured external endpoints:

1. **`https://inner-level-app.vercel.app`**:
   - **Purpose**: Opens the official InnerLevel web application in your default web browser.
   - **Trigger**: Opened only when you explicitly invoke the **"Open InnerLevel"** command.
2. **User-configured Supabase Backend (`https://<your-project>.supabase.co`)**:
   - **Purpose**: Authenticates your InnerLevel account using email/password and syncs forged action cards generated from your Obsidian study notes into your InnerLevel card database via Supabase RPC (`append_obsidian_card`).
   - **Data Sent**: Card title, summary description (or note excerpt), calculated study duration, energy cost, priority, SRS tags, and `obsidian://open` deep links pointing back to your local note.
   - **Trigger**: Executed only when you run a sync command, click **"Sign in / test"** in plugin settings, or when **Automatic daily sync** is explicitly enabled in settings.

### Vault Access & File Enumeration
- **`vault.getMarkdownFiles()` Rationale**: The plugin scans the frontmatter of markdown files in your vault to check for SRS review metadata fields (`due_date`, `note_type` / `tipo_nota`, `area`, etc.) to determine which study notes are due for review today (`due_date <= today`).
- **File Content Access**: Note text is read locally to extract brief excerpts for action card descriptions and to calculate review duration. Note contents are never uploaded or shared anywhere other than the card title and description sent to your private InnerLevel account.
- **Data Storage**: All plugin settings and authentication tokens are persisted strictly through Obsidian's native plugin storage APIs (`this.loadData()` and `this.saveData()`). No browser `localStorage` or `sessionStorage` APIs are used.

---

## ⚙️ Configuration & Setup

1. Install and enable **InnerLevel Sync** in Obsidian Settings.
2. Navigate to **Obsidian Settings > InnerLevel Sync**.
3. Configure your **InnerLevel** Supabase connection details:
   - **Supabase URL**: Your InnerLevel Supabase project URL.
   - **Supabase Anon Key**: Your InnerLevel project anon key.
   - **Email & Password**: Your existing InnerLevel account credentials.
4. Click **Sign in / test** to verify connection.
5. *(Optional)* Select your preferred **Sync Mode** (*Por Área / By Area* or *Individual*) and enable **Automatic daily sync**.

---

## 📝 Frontmatter Format (Bilingual Support)

You can use either **English** or **Spanish** frontmatter keys in your markdown notes. The plugin automatically detects and handles both formats:

| Concept | English Keys | Spanish Keys | Example Values |
| :--- | :--- | :--- | :--- |
| **Note Type** | `note_type`, `type` | `tipo_nota`, `tipo` | `technical` / `tecnica`, `study_note` / `nota_estudio`, `quick_capture` / `captura_rapida`, `permanent` / `permanente`, `problem` / `problema` |
| **Area / Topic** | `area`, `topic`, `subject` | `area` | `Infraestructura-Nube`, `Data Science`, `Algorithms` |
| **Due Date** | `due_date`, `next_review`, `due` | `proxima-revision`, `proxima_revision` | `2026-09-29` (YYYY-MM-DD) |
| **Comprehension** | `understanding_level`, `comprehension` | `nivel-comprension`, `nivel_comprension` | `❓`, `🤔`, `💡`, `✅`, `🎯` (or `COMPLETED` / `COMPLETADO`) |
| **Review Time** | `review_time`, `estimated_time`, `duration` | `tiempo-repaso`, `tiempo-estimado` | `5min`, `15min`, `30min`, `1h` |
| **Review Result** | `review_result`, `result` | `resultado-repaso` | `failed` / `fallado`, `difficult` / `dificil`, `correct` / `correcto`, `easy` / `facil` |
| **Priority** | `priority` | `prioridad` | `high` / `alta`, `medium` / `media`, `low` / `baja` |
| **Status** | `status`, `state` | `status`, `estado` | `🌱 Semilla`, `Archived` / `🎉 Completado / Archivado` |

### Sample English Frontmatter

```yaml
---
note_type: technical
area: Cloud Infrastructure
status: 🌱 Growing
due_date: 2026-09-29
understanding: 🤔
review_time: 15min
priority: high
---
```

### Sample Spanish Frontmatter

```yaml
---
tipo_nota: tecnica
area: Infraestructura-Nube
status: 🌱 Creciendo
proxima-revision: 2026-09-29
nivel-comprension: 🤔
tiempo-repaso: 15min
prioridad: alta
---
```

---

## 🕹️ Commands

Access these commands from the Obsidian Command Palette (`Ctrl+P` or `Cmd+P`):

- **Sync today's due notes**: Syncs notes using your default mode setting.
- **Sync today's due notes (by area)**: Syncs notes grouped into area summary cards.
- **Sync today's due notes (individual)**: Syncs notes as individual action cards.
- **Resync today's due notes**: Forces a resync even if notes were already synced today.
- **Capture selection / current note**: Captures the current note or selection as a quick seed card.
- **Open InnerLevel**: Opens the InnerLevel web application in your default browser.

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
