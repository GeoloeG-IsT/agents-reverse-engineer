#!/usr/bin/env node
/**
 * CLI entry point for agents-reverse
 *
 * Commands:
 *   init              Create default configuration
 *   discover [path]   Discover files to analyze
 *   generate [path]   Generate documentation plan
 */

import { initCommand, type InitOptions } from './init.js';
import { discoverCommand, type DiscoverOptions } from './discover.js';
import { generateCommand, type GenerateOptions } from './generate.js';

const USAGE = `
agents-reverse - AI-friendly codebase documentation

Commands:
  init              Create default configuration
  discover [path]   Discover files to analyze (default: current directory)
  generate [path]   Generate documentation plan (default: current directory)

Options:
  --quiet, -q       Suppress output except errors
  --verbose, -v     Show detailed output
  --show-excluded   List each excluded file (discover only)
  --dry-run         Show plan without writing files (generate only)
  --budget <n>      Override token budget (generate only)
  --help, -h        Show this help

Examples:
  ar init
  ar discover
  ar generate --dry-run
  ar generate ./my-project --budget 50000
`;

/**
 * Parse command-line arguments.
 *
 * Extracts the command, positional arguments, and flags.
 * Handles global flags (--help, -h) that may appear before the command.
 */
function parseArgs(args: string[]): {
  command: string | undefined;
  positional: string[];
  flags: Set<string>;
  values: Map<string, string>;
} {
  let command: string | undefined;
  const positional: string[] = [];
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      // Check if next arg is a value (not starting with -)
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        values.set(flagName, args[i + 1]);
        i++; // Skip the value
      } else {
        flags.add(flagName);
      }
    } else if (arg.startsWith('-')) {
      // Handle short flags (e.g., -q, -h, -v)
      for (const char of arg.slice(1)) {
        switch (char) {
          case 'q':
            flags.add('quiet');
            break;
          case 'h':
            flags.add('help');
            break;
          case 'v':
            flags.add('verbose');
            break;
          default:
            // Unknown short flag - ignore
            break;
        }
      }
    } else if (!command) {
      // First non-flag argument is the command
      command = arg;
    } else {
      // Subsequent non-flag arguments are positional
      positional.push(arg);
    }
  }

  return { command, positional, flags, values };
}

/**
 * Show usage information and exit.
 */
function showHelp(): void {
  console.log(USAGE);
  process.exit(0);
}

/**
 * Show error for unknown command and exit.
 */
function showUnknownCommand(command: string): void {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'ar --help' for usage information.`);
  process.exit(1);
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, positional, flags, values } = parseArgs(args);

  // Handle help flag anywhere
  if (flags.has('help') || args.length === 0) {
    showHelp();
  }

  // Route to command handlers
  switch (command) {
    case 'init': {
      const options: InitOptions = {
        interactive: flags.has('interactive'),
      };
      await initCommand(positional[0] || '.', options);
      break;
    }

    case 'discover': {
      const options: DiscoverOptions = {
        quiet: flags.has('quiet'),
        showExcluded: flags.has('show-excluded'),
        verbose: !flags.has('quiet'),
      };
      await discoverCommand(positional[0] || '.', options);
      break;
    }

    case 'generate': {
      const options: GenerateOptions = {
        quiet: flags.has('quiet'),
        verbose: flags.has('verbose'),
        dryRun: flags.has('dry-run'),
        budget: values.has('budget') ? parseInt(values.get('budget')!, 10) : undefined,
      };
      await generateCommand(positional[0] || '.', options);
      break;
    }

    default:
      if (command) {
        showUnknownCommand(command);
      }
      showHelp();
  }
}

// Run main and handle any uncaught errors
main().catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
