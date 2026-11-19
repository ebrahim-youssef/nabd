# Design system

The source is the Claude Design artifact [nabd](https://claude.ai/artifact/RkhFPns49rDaDVDgMxG4ah).
Tokens are copied into the repository by hand; there is no MCP sync.

## Colors

| Token          | Light                    | Dark                     |
| -------------- | ------------------------ | ------------------------ |
| `bg`           | `#F5F0E5`                | `#06171A`                |
| `surface`      | `#FFFFFF`                | `#0D2527`                |
| `now`          | `#FBF6EA`                | `#102C2E`                |
| `line`         | `#E7DECB`                | `#183539`                |
| `track`        | `#EDE5D3`                | `#183539`                |
| `ink`          | `#13302A`                | `#ECF2EE`                |
| `mute`         | `#5B6B64`                | `#93A8A3`                |
| `hero`         | `#0B3A32`                | `#030D10`                |
| `hero-ink`     | `#F2E5C6`                | `#F2E5C6`                |
| `hero-mute`    | `#B9C9C2`                | `#8DA19C`                |
| `gold`         | `#CFA552`                | `#D9B25E`                |
| `gold-ink`     | `#8A6620`                | `#D9B25E`                |
| `progress`     | `#8A6620`                | `#D9B25E`                |
| `accent`       | `#114A40`                | `#D9B25E`                |
| `on-accent`    | `#FFFFFF`                | `#1A1405`                |
| `box`          | `#9A8866`                | `#5E7E80`                |
| `tick`         | `#13302A`                | `#06171A`                |
| `toast-action` | `#CFA552`                | `#8A6620`                |
| `scrim`        | `rgba(11,30,26,0.45)`    | `rgba(0,0,0,0.6)`        |
| `sun`          | `#FFE3A3`                | `#FFE3A3`                |
| `moon`         | `#F4E2B4`                | `#F4E2B4`                |
| `path-rest`    | `rgba(242,229,198,0.22)` | `rgba(242,229,198,0.22)` |
| `mark-rest`    | `rgba(242,229,198,0.4)`  | `rgba(242,229,198,0.4)`  |

## Type

| Token          | Size / line height            | Family      |
| -------------- | ----------------------------- | ----------- |
| `screen-title` | 30px / 38px                   | Display     |
| `prayer-name`  | 27px / 31.05px                | Display     |
| `sheet-title`  | 22px / 30px                   | Display     |
| `tile-count`   | 20px / 26px                   | Display     |
| `card-title`   | 18px / 26px                   | Display     |
| `countdown`    | 22px / 27.5px, 0.5px tracking | Sans Medium |
| `row-label`    | 15px / 20.25px                | Sans Medium |
| `button`       | 15px / 20px                   | Sans Bold   |
| `body`         | 14px / 22.4px                 | Sans        |
| `meta`         | 12.5px / 17.5px               | Sans        |
| `caption`      | 12px / 16.2px                 | Sans        |
| `chip`         | 11px / 16px                   | Sans Bold   |
| `daily-line`   | 13.5px / 21.6px               | Text        |

Font families are Thmanyah Serif Display Bold, Thmanyah Sans Regular, Thmanyah Sans Medium,
Thmanyah Sans Bold, and Thmanyah Serif Text Regular. The license permits app embedding only.
Keep the files only in the git-ignored `assets/fonts/thmanyah/` directory; never commit or host
them. Copy the five OTFs there locally; release build scripts stop when a file is missing, empty,
or smaller than 1 KB.
Design weight 600 uses the Bold file because no SemiBold file is licensed.

## Radius and size

| Radius token     | Value |
| ---------------- | ----: |
| `control`        |    10 |
| `button`         |    14 |
| `tile`           |    18 |
| `card`           |    20 |
| `widget`, `tabs` |    26 |
| `sheet`          |    28 |
| `hero`           |    30 |
| `pill`           |  9999 |

| Size token | Value |
| ---------- | ----: |
| Row        |    46 |
| Star       |    28 |
| Icon       |    24 |
| Pattern    |    56 |
| Tab bar    |    86 |
| Hero       |   262 |

Large text must remain usable at 130% and 200% text scaling.
