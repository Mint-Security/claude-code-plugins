# Mint Security plugins for Claude Code

Open-source plugins for [Claude Code](https://claude.com/claude-code) from Mint Security. Each one is a Claude Code *mod*: JavaScript, written in TypeScript, that Claude Code runs inside itself with your user permissions. Each plugin's README says what it does on your machine and what it keeps.

| Plugin | What it does |
|---|---|
| [`dividend`](plugins/dividend) | Make sense of your session's context, prompt cache and usage limits through quick tips and short lessons |

## Install

Dividend needs Claude Code 2.1.291 or newer; it is tested on 2.1.291. From a shell:

```bash
claude plugin marketplace add Mint-Security/claude-code-plugins
claude plugin install dividend@mint-security
```

Then start a Claude Code session, or run `/reload-plugins` in one that is open, and run `/dividend` to open its pane. The desktop app's Code tab picks it up too.

Or, inside a terminal Claude Code session, in one line: `/plugin install dividend --marketplace Mint-Security/claude-code-plugins` (answer `y` to add the marketplace, then pick where to install it). In the desktop app, add the marketplace `Mint-Security/claude-code-plugins` under Settings, Plugins, Add, then install Dividend from it.

Auto-update is off by default for this marketplace. To stay on a reviewed release, add the marketplace pinned to its tag instead: `claude plugin marketplace add Mint-Security/claude-code-plugins#dividend--v0.1.0`, then `claude plugin install dividend@mint-security`.

## Dividend

Make sense of your Claude Code session's context, prompt cache and usage limits through quick tips and short lessons, while you work. Insights come from what Claude Code reports, and everything stays within your machine. See [plugins/dividend](plugins/dividend/README.md) for what it shows, what it does on your machine and what it keeps.

## Develop

```bash
claude plugin validate .
claude plugin validate plugins/dividend
claude plugin test plugins/dividend
claude --plugin-dir plugins/dividend      # run it in a session
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache-2.0](LICENSE)
