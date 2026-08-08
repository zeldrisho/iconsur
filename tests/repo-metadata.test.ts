// Guards the release-metadata sync: package.json (npmjs), README.md, and the
// GitHub repo/tags must describe the same package. Keeps `gh`-driven release
// syncing (see scripts/release-sync.sh and docs/release.md) honest.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
  name: string;
  version: string;
  description: string;
  repository: { url: string };
};
const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");

describe("release metadata sync (README / package.json / npm / GitHub)", () => {
  it("keeps the package description in sync with the README", () => {
    expect(pkg.description).toBeTruthy();
    expect(readme.toLowerCase()).toContain(pkg.description.toLowerCase());
  });

  it("keeps the package name and repository in sync with the README install instructions", () => {
    expect(pkg.name).toBe("@zeldrisho/iconsur");
    expect(pkg.repository.url).toBe("https://github.com/zeldrisho/iconsur");
    expect(readme).toContain(`npm install -g ${pkg.name}`);
    expect(readme).toContain("github.com/zeldrisho/iconsur");
  });

  it("stores versions without the v prefix (git tags are v<version>)", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).not.toMatch(/^v/);
  });
});
