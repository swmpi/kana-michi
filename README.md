# Kana Michi (かなみち)

A drag and drop game for learning Japanese hiragana and katakana, set against scenes of rural Japan and Tokyo, by day or by night.

*Michi* (道) means "road" or "path," so Kana Michi is your path through the kana.

## Features

- **Drag and drop matching.** Each round deals 8 kana tiles. Drop each tile on the romaji sound it makes.
- **Tap mode.** On phones, or if you prefer clicking, tap a tile and then tap its sound.
- **Easy script switching.** Toggle between Hiragana, Katakana, or a Mix of both at any time, even in the middle of a round.
- **Four scenes**
  - Countryside by day: golden rice terraces, a snow-capped volcano, a thatched farmhouse, a shrine gate, and red dragonflies
  - Countryside at night: moonlight, lit windows, and fireflies
  - Tokyo by day: a skyline, a lattice broadcast tower, an elevated train, and shop signs written in kana
  - Tokyo at night: neon signs, glowing windows, and a lit train
- **Themed tiles.** Wooden ema plaques in the countryside, station-sign tiles in Tokyo, and neon tiles at night.
- **Learning help**
  - A wrong drop shakes the tile and shows its real reading
  - "Peek a pair" highlights one correct match when you're stuck
  - Choose which rows to practice, or use the quick buttons for all 46 basic kana or everything including dakuten (が, ざ, だ, ば, ぱ)
- **Progress tracking.** Round count, misses, current streak, and best streak. Each cleared round gets a 合格 (pass) stamp, or 満点 (perfect score) for a flawless round.
- **Sound.** Woodblock tones in the countryside and station chimes in Tokyo. If your device has a Japanese voice installed, each kana is spoken aloud when matched.
- **Remembers your settings.** Script, scene, rows, sound, and best streak are saved in your browser.

## Getting started

No build step or dependencies. Plain HTML5, CSS, and JavaScript.

```bash
git clone https://github.com/swmpi/kana-michi.git
cd kana-michi
```

Then open `index.html` in a browser, or serve the folder with any static server:

```bash
# Python
python3 -m http.server 8000

# PHP
php -S localhost:8000
```

and visit `http://localhost:8000`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `H` | Hiragana |
| `K` | Katakana |
| `M` | Mix |
| `N` | New round |
| `Esc` | Drop the selected tile |
| `Tab` / `Enter` | Select tiles and sounds without a mouse |

## Notes

- Fonts are loaded from Google Fonts (Zen Maru Gothic, Shippori Mincho B1, Dela Gothic One, DM Mono). The game still works offline with system fallback fonts.
- The scenes are drawn on a canvas at runtime, so there are no image assets.
- Animations are turned off when your system has "reduce motion" enabled.
- ぢ and づ are left out because they share readings (ji, zu) with じ and ず.
