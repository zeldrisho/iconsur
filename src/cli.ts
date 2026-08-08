// Commander CLI surface: `set`, `unset`, `cache`.
import { Command } from "commander";
import { globSync } from "glob";
import { clearIconCache } from "./cache.ts";
import { removeCustomIcon, runWithEscalation } from "./fileicon.ts";
import { processApp } from "./icon.ts";

export interface CliOptions {
  local?: boolean;
  keyword?: string;
  region?: string;
  scale?: string;
  color?: string;
  input?: string;
  output?: string;
}

function expandDirs(dir: string, otherDirs: string[]): string[] {
  if (!otherDirs.length && dir.includes("*")) {
    return globSync(dir);
  }
  return [dir, ...otherDirs];
}

export function buildProgram(version: string): Command {
  const program = new Command();
  program.name("iconsur").version(version);

  program.option("-l, --local", "Directly create an icon locally without searching for an iOS App");
  program.option("-k, --keyword <keyword>", "Specify custom keyword to search for an iOS App");
  program.option("-r, --region <region>", "Specify country or region to search (default: us)");
  program.option("-s, --scale <float>", "Specify scale for adaptive icon (default: 0.9)");
  program.option("-c, --color <hex>", "Specify color for adaptive icon (default: ffffff)");
  program.option("-i, --input <path>", "Specify custom input image for adaptive icon");
  program.option(
    "-o, --output <path>",
    "Write the generated icon to a file without actually applying to App",
  );

  program.command("set <dir> [otherDirs...]").action(async (dir: string, otherDirs: string[]) => {
    const opts = program.opts<CliOptions>();
    for (const appDir of expandDirs(dir, otherDirs)) {
      await processApp(appDir, {
        local: opts.local ?? false,
        keyword: opts.keyword,
        region: opts.region,
        scale: opts.scale,
        color: opts.color,
        input: opts.input,
        output: opts.output,
      });
    }
  });

  program.command("unset <dir> [otherDirs...]").action((dir: string, otherDirs: string[]) => {
    for (const appDir of expandDirs(dir, otherDirs)) {
      runWithEscalation(appDir, (o) => removeCustomIcon(appDir, o), "Removing icon from");
    }
  });

  program
    .command("cache")
    .option("--system", "Also remove the system-wide IconServices cache (requires sudo)")
    .action((opts: { system?: boolean }) => {
      clearIconCache({ system: opts.system });
    });

  return program;
}
