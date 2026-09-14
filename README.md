<span align="center">

# IconSur: macOS Big Sur Adaptive Icon Generator

<a href="https://www.npmjs.com/package/@zeldrisho/iconsur"><img alt="npm version" src="https://badgen.net/npm/v/@zeldrisho/iconsur"></a>
<a href="https://www.npmjs.com/package/@zeldrisho/iconsur"><img alt="npm downloads" src="https://badgen.net/npm/dt/@zeldrisho/iconsur"></a>

</span>

`iconsur` generates macOS Big Sur-style adaptive icons for third-party apps, using the related iOS App Store artwork when available or a locally composed icon otherwise.

![IconSur preview](https://user-images.githubusercontent.com/5051300/85926574-ebfb9d80-b8d2-11ea-836b-28e38d1f3447.png)

> **Fork:** a continuation of the archived [rikumi/iconsur](https://github.com/rikumi/iconsur), published as `@zeldrisho/iconsur`.

## Install

Use without a permanent installation:

```sh
npx @zeldrisho/iconsur@latest set "/Applications/Microsoft Word.app"
```

Or install globally:

```sh
npm install -g @zeldrisho/iconsur
```

Requires Node.js `>=22.18`. Standalone arm64 and x64 binaries are available on the [Releases](https://github.com/zeldrisho/iconsur/releases) page.

## Usage

```sh
# Use matching App Store artwork
iconsur set /Applications/Microsoft\ Word.app

# Force local generation, optionally customizing the source, scale, and color
iconsur set /Applications/Visual\ Studio\ Code.app -l -i /path/to/icon -s 0.8 -c 87cdf0

# Refresh Finder and Dock after applying an icon
iconsur cache

# Restore an app's original icon
iconsur unset /Applications/Visual\ Studio\ Code.app
iconsur cache
```

Options:

- `-k, --keyword` changes the App Store search term.
- `-r, --region` selects a two-letter App Store region, such as `cn`.
- `-l, --local` skips the App Store and generates locally.
- `-i, --input` supplies a custom source icon.
- `-s, --scale` and `-c, --color` customize locally generated icons.
- `-o, --output` writes a PNG without modifying the app bundle.

Without `-o`, `set` previews the generated and current icons and asks for confirmation in an interactive terminal. Enter applies the icon; `n` declines. Use `-y`/`--yes` or a non-interactive run to skip confirmation. `unset` restores the original icon.

## Permissions

Icons are applied without elevation when the app is writable. For system-owned or protected bundles, `set` and `unset` retry the same operation with `sudo`. `cache` only clears per-user caches; `cache --system` additionally requests permission to remove the system icon cache and skips that removal in non-interactive sessions.

## Maintainer documentation

- [Architecture and security boundaries](docs/architecture.md)
- [Development, testing, and releases](docs/development.md)

## Credits

Thanks to [LiteIcon](https://freemacsoft.net/liteicon/) for the inspiration and [fileicon](https://github.com/mklement0/fileicon) for the icon-set/remove mechanism.
