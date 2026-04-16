export type SlashCommandDef = {
  key: string;
  name: string;
  description: string;
  executeLocal: boolean;
};

export const SLASH_COMMANDS: SlashCommandDef[] = [
  { key: 'clear',   name: 'clear',   description: 'Clear chat history',          executeLocal: true  },
  { key: 'compact', name: 'compact', description: 'Compact conversation context', executeLocal: true  },
  { key: 'stop',    name: 'stop',    description: 'Stop current run',             executeLocal: true  },
  { key: 'new',     name: 'new',     description: 'Start a new session',          executeLocal: true  },
  { key: 'help',    name: 'help',    description: 'Show available commands',      executeLocal: false },
];

// Returns commands matching the filter (by name prefix or description substring).
// Empty filter returns all commands.
export function getSlashCommandCompletions(filter: string): SlashCommandDef[] {
  const lower = filter.toLowerCase();
  return lower
    ? SLASH_COMMANDS.filter(
        (cmd) =>
          cmd.name.startsWith(lower) ||
          cmd.description.toLowerCase().includes(lower),
      )
    : SLASH_COMMANDS;
}

// Returns the matched SlashCommandDef if the input is "/name" or "/name <args>".
// Returns null if not a recognized slash command.
export function parseSlashCommand(text: string): SlashCommandDef | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const name = trimmed.slice(1).split(/\s/)[0].toLowerCase();
  return SLASH_COMMANDS.find((cmd) => cmd.name === name) ?? null;
}
