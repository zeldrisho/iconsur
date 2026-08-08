<span align="center">

# IconSur: macOS Big Sur Adaptive Icon Generator

<a href="https://www.npmjs.com/package/@zeldrisho/iconsur"><img title="npm version" src="https://badgen.net/npm/v/@zeldrisho/iconsur" ></a>
<a href="https://www.npmjs.com/package/@zeldrisho/iconsur"><img title="npm downloads" src="https://badgen.net/npm/dt/@zeldrisho/iconsur" ></a>
<a href="https://github.com/zeldrisho/iconsur/commit"><img title="github commits" src="https://badgen.net/github/last-commit/zeldrisho/iconsur" ></a>

</p>

</span>

`iconsur` is a command line tool to easily generate macOS Big Sur styled adaptive icons for third-party apps.

The generation is based on the most related iOS app from the App Store, or, if there isn't one, is created from the original icon, in which case the background color and the scaling can be customized.

![image](https://user-images.githubusercontent.com/5051300/85926574-ebfb9d80-b8d2-11ea-836b-28e38d1f3447.png)

> **Fork**: a continuation of the archived [rikumi/iconsur](https://github.com/rikumi/iconsur) (last upstream release `1.7.0`, Apr 2022). This fork publishes as `@zeldrisho/iconsur`.

## Installation

Install it easily:

### Using npm

```shell
npm install -g @zeldrisho/iconsur
```

Requires Node.js `>=22.18` (the CLI runs as TypeScript source via Node's built-in type stripping).

## Usage

Download the `iconsur` binary for your platform (macOS, Linux, or Windows; arm64 or x64) from [Releases](https://github.com/zeldrisho/iconsur/releases), `chmod +x` (macOS/Linux) and include it in your PATH.

Start generating your first adaptive app icon:

```sh
iconsur set /Applications/Microsoft\ Word.app/

# Update the icon cache and reload Finder & Dock
iconsur cache

# Then the new icon will appear, and will last until the App is updated next time.
```

This will search for the App Store and use the most related iOS app.

By default, the name for the macOS app is used to search for a corresponding iOS app. You can change the keyword by specifying `-k`/`--keyword`.

If your app only has a corresponding iOS app in non-America store, you may like to specify the 2-letter country code with option `-r`/`--region`.

```sh
iconsur set /Applications/QQMusic.app/ -r cn
iconsur cache
```

For apps that do not have a corresponding iOS app, an irrelevant app can be found. In these cases, you may need to specify the `-l`/`--local` option to forcibly generate an icon locally:

```sh
iconsur set /Applications/Visual\ Studio\ Code.app/ -l
iconsur cache
```

You can also use your own original icon with the `-i`/`--input` option. Here IconSur plays the part of adding the background, masking the icon into continuous corners, and adding correct paddings around the masked icon.

```sh
iconsur set /Applications/Visual\ Studio\ Code.app/ -l -i /path/to/your/icon
iconsur cache
```

By default, the original app icon is scaled by 0.9 and is applied to a white background. You may like to change the scaling and background color of the icon. However, if the original icon is opaque, it will not get scaled down in case you specify an original opaque iOS icon from an app developer or a jailbreak icon pack.

```sh
iconsur set /Applications/Visual\ Studio\ Code.app/ -l -s 0.8 -c 87cdf0
iconsur cache
```

To remove the icon previously set for a specific app, use the `unset` subcommand:

```sh
iconsur unset /Applications/Microsoft\ Word.app/
iconsur unset /Applications/Visual\ Studio\ Code.app/
iconsur cache
```

### Preview before applying

When `iconsur set` generates an icon for an app (no `-o`), it shows the preview path and asks for confirmation in an interactive terminal before touching the bundle:

```sh
$ iconsur set /Applications/Visual\ Studio\ Code.app/ -l
Generated preview at /var/folders/.../tmp-icon-abc123.png
Apply icon to /Applications/Visual Studio Code.app? [y/N] y
```

Answer anything other than `y` to keep the original icon; the generated preview stays on disk. Non-interactive runs (scripts, CI) apply directly, and `-y`/`--yes` skips the prompt. `iconsur unset <app>` restores the original icon at any time.

### Permissions (no blanket `sudo`)

`iconsur` runs **unprivileged by default**:

- Apps you own (e.g. `~/Applications` or most third-party apps in `/Applications`) are set without `sudo`.
- System-owned, Mac App Store, or SIP-protected bundles require write access to the bundle; `iconsur` detects this and **automatically retries the same operation with `sudo`** (one password prompt, with an explanatory message).
- `iconsur cache` clears your **per-user** icon caches and restarts Dock/Finder — no elevation, ever.
- `iconsur cache --system` additionally removes the system-wide `/Library/Caches/com.apple.iconservices.store` (opt-in escalation; skipped with a note in non-interactive sessions so scripts/CI never hang on a prompt).

## Example

See the original author's [personal iconsur setup](https://gist.github.com/rikumi/e2ac39882a7dcd29642f29343da5a54a) as an example.

### Platform notes

- **macOS**: full functionality (`set`/`unset`/`cache`) — the icon apply step uses `osascript`/`xattr`, which ship with macOS.
- **Linux / Windows**: the binaries are published for convenience and support the icon-generation pipeline (`set ... -o out.png`, `--help`); `set`/`unset`/`cache` require macOS system services and will error there.

## Installation channels

- **npm**: `npm install -g @zeldrisho/iconsur` (recommended; requires Node `>=22.18`).
- **Homebrew**: the upstream `iconsur` formula is deprecated and will be disabled (2027-02-01); a fork tap is not maintained — use npm or the release binary instead.

## Credits

Thanks to [LiteIcon](https://freemacsoft.net/liteicon/) for the original inspiration, and [fileicon by mklement0](https://github.com/mklement0/fileicon) for the icon-set/remove mechanism.
