# InnerLevel Sync

Obsidian plugin that turns Segundo_Cerebro captures and due SRS notes into InnerLevel action cards.

## Development

```bash
npm install
npm run build
```

Copy the built plugin into the vault plugin folder, then enable **InnerLevel Sync** in Obsidian:

```bash
mkdir -p /home/gabriel/Documents/Segundo_Cerebro/.obsidian/plugins/innerlevel-sync
cp manifest.json main.js /home/gabriel/Documents/Segundo_Cerebro/.obsidian/plugins/innerlevel-sync/
```

Configure the **InnerLevel** Supabase project URL, anon key, email, and password in Obsidian Settings. The plugin and InnerLevel web app must use the same Supabase project; do not use the separate `innerlevel-sync` project for the final setup.

Commands:

- Capture selection / current note
- Sync today's due notes
- Resync today's due notes (use after changing Supabase projects or card mapping)
- Open InnerLevel
