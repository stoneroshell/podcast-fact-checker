# Scio — Design System: Greco-Roman Modern

**Document purpose:** Single source of truth for visual design. Use for UI implementation, component styling, and Tailwind/Next.js theme setup. Format is optimized for AI agents and code generation.

**Aesthetic direction:** Classical authority meets modern precision. Dark, geometric, honest. Inspired by Roman editorial design, ancient sculpture, and contemporary web craft. Every element should feel carved, not generated.

---

## 1. Reference imagery

| Source | Key takeaways |
|--------|----------------|
| [Gods poster](https://cdn.magicpatterns.com/uploads/sPkDo2ziacRtzLMZj4HqJH/gods_inspo.jpg) | Bold editorial serif, deep black ground, dramatic red display type, classical sculpture, dense typographic texture |
| [Greco-Roman](https://cdn.magicpatterns.com/uploads/n3jrYySRZNzptYFKgkHEeo/greco_roman_inspo.webp) | Modern classical letterforms, lavender/yellow gradient accents, geometric arches and circles, starburst ornaments, clean structured layout |

---

## 2. Color palette

### 2.1 Tokens

| Role | Name | Hex | Usage |
|------|------|-----|--------|
| Primary background | Deep Charcoal | `#0D0D0D` | Base dark theme; all primary surfaces |
| Accent gold | Warm Muted Gold | `#EDC753` | Primary highlights, icons, CTAs, emphasis, ornamental details |
| Highlight yellow | Electric Yellow | `#E6FF4D` | Active states, interactive feedback, subtle emphasis |
| Muted lavender | Soft Lavender | `#9B91F5` | Secondary panels, hover states, gradient accents |
| Off-white / text | Clean White | `#F5F5F5` | Primary body and headings on dark |
| Deep red | Dramatic Red | `#D22B2B` | Alerts, warnings, errors, critical highlights |
| Stone gray | Stone | `#B0B0B0` | Secondary text, dividers, captions, metadata |

### 2.2 Color usage rules

- **Never** use pure white `#FFFFFF` — use Off-White `#F5F5F5` for text.
- **Never** use pure black for backgrounds — use Deep Charcoal `#0D0D0D`.
- Gold is the **primary accent** — use sparingly for impact.
- Lavender is **atmospheric depth** — secondary surfaces, not primary actions.
- Deep Red is **urgency only** — not decorative.
- Stone Gray is **supporting text** — dates, labels, captions, dividers.

### 2.3 CSS custom properties

Use in `app/globals.css` and any component CSS:

```css
:root {
  --color-bg-primary:    #0D0D0D;
  --color-bg-secondary:  #141414;
  --color-bg-panel:      #1A1A1A;
  --color-accent-gold:   #EDC753;
  --color-highlight:     #E6FF4D;
  --color-lavender:      #9B91F5;
  --color-text-primary:  #F5F5F5;
  --color-text-secondary:#B0B0B0;
  --color-danger:        #D22B2B;
  --color-border:        rgba(237, 199, 83, 0.15);
  --color-border-subtle: rgba(176, 176, 176, 0.12);
}
```

### 2.4 Tailwind theme mapping

In `tailwind.config.ts`, extend `theme` with:

```ts
// tailwind.config.ts — extend theme.colors
colors: {
  // Design system aliases (use these in classes)
  bg: {
    primary: "#0D0D0D",
    secondary: "#141414",
    panel: "#1A1A1A",
  },
  accent: {
    gold: "#EDC753",
    lavender: "#9B91F5",
  },
  highlight: "#E6FF4D",
  text: {
    primary: "#F5F5F5",
    secondary: "#B0B0B0",
  },
  danger: "#D22B2B",
  border: {
    gold: "rgba(237, 199, 83, 0.15)",
    "gold-strong": "rgba(237, 199, 83, 0.6)",
    subtle: "rgba(176, 176, 176, 0.12)",
  },
}
```

Example classes: `bg-bg-primary`, `text-accent-gold`, `border-border-gold`, `text-text-secondary`.

---

## 3. Typography

### 3.1 Font roles

| Role | Font | Source | Rationale |
|------|------|--------|-----------|
| Display / H1 | Cinzel | Google Fonts | Roman-inscribed letterforms; uppercase authority |
| Headings H2–H4 | Cormorant Garamond | Google Fonts | Editorial serif; elegant, classical |
| Body / UI | Inter | Google Fonts | Neutral, modern; contrasts with display |
| Monospace / code | JetBrains Mono | Google Fonts | Data, code, timestamps |

### 3.2 Next.js font setup (next/font)

Create `lib/fonts.ts`:

```ts
// lib/fonts.ts
import {
  Cinzel,
  Cormorant_Garamond,
  Inter,
  JetBrains_Mono,
} from "next/font/google";

export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-display",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});
```

In `app/layout.tsx`: apply `cinzel.variable`, `cormorant.variable`, `inter.variable`, `jetbrainsMono.variable` to `<html className={...}>`, and set `font-sans` to Inter (or use a default body class with `var(--font-body)`).

### 3.3 Google Fonts link (fallback if not using next/font)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### 3.4 Type scale

| Token | Font | Size | Weight | Line height | Usage |
|-------|------|------|--------|--------------|--------|
| display-xl | Cinzel | 96px / 6rem | 700 | 1.0 | Hero, poster-scale titles |
| display-lg | Cinzel | 64px / 4rem | 700 | 1.05 | Page heroes, major sections |
| display-md | Cinzel | 48px / 3rem | 600 | 1.1 | Section headers |
| heading-xl | Cormorant Garamond | 36px / 2.25rem | 600 | 1.2 | Article titles, card headers |
| heading-lg | Cormorant Garamond | 28px / 1.75rem | 400 | 1.3 | Subheadings, panel titles |
| heading-md | Cormorant Garamond | 22px / 1.375rem | 400 | 1.4 | Tertiary headings |
| body-lg | Inter | 18px / 1.125rem | 400 | 1.6 | Lead paragraphs |
| body-md | Inter | 16px / 1rem | 400 | 1.6 | Standard body |
| body-sm | Inter | 14px / 0.875rem | 400 | 1.5 | Secondary, captions |
| label | Inter | 12px / 0.75rem | 500 | 1.4 | UI labels, tags, metadata |
| mono | JetBrains Mono | 14px / 0.875rem | 400 | 1.5 | Data, timestamps |

### 3.5 Typography rules

- **Display (Cinzel):** Prefer uppercase; reads as inscribed stone.
- **Letter-spacing (display):** `0.05em`–`0.15em` for small Cinzel; tighter at large sizes.
- **Cormorant italic:** Use for pull quotes and emphasis.
- **Do not mix** Cinzel and Cormorant in the same heading.
- **Body (Inter):** Prefer 300 or 400 on dark backgrounds.
- **Gold text:** Single words or short phrases only — never full paragraphs.

### 3.6 Tailwind typography extension

```ts
// tailwind.config.ts — extend theme
fontFamily: {
  display: ["var(--font-display)", "Cinzel", "serif"],
  heading: ["var(--font-heading)", "Cormorant Garamond", "serif"],
  body: ["var(--font-body)", "Inter", "sans-serif"],
  mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
},
fontSize: {
  "display-xl": ["6rem", { lineHeight: "1" }],
  "display-lg": ["4rem", { lineHeight: "1.05" }],
  "display-md": ["3rem", { lineHeight: "1.1" }],
  "heading-xl": ["2.25rem", { lineHeight: "1.2" }],
  "heading-lg": ["1.75rem", { lineHeight: "1.3" }],
  "heading-md": ["1.375rem", { lineHeight: "1.4" }],
  "body-lg": ["1.125rem", { lineHeight: "1.6" }],
  "body-md": ["1rem", { lineHeight: "1.6" }],
  "body-sm": ["0.875rem", { lineHeight: "1.5" }],
  label: ["0.75rem", { lineHeight: "1.4" }],
  mono: ["0.875rem", { lineHeight: "1.5" }],
},
letterSpacing: {
  "display-tight": "0.02em",
  "display-normal": "0.05em",
  "display-wide": "0.15em",
  "label": "0.08em",
  "cta": "0.08em",
},
```

Example classes: `font-display text-display-lg uppercase tracking-display-normal`, `font-heading text-heading-xl`, `font-body text-body-md text-text-primary`.

---

## 4. Spacing and layout

### 4.1 Spacing scale (8px base)

| Token | Value | Usage |
|-------|--------|--------|
| space-1 | 4px | Micro gaps, icon padding |
| space-2 | 8px | Tight component spacing |
| space-3 | 12px | Internal padding |
| space-4 | 16px | Standard element spacing |
| space-6 | 24px | Section sub-spacing |
| space-8 | 32px | Component separation |
| space-12 | 48px | Section breathing room |
| space-16 | 64px | Major section gaps |
| space-24 | 96px | Hero / page-level |
| space-32 | 128px | Large architectural spacing |

Tailwind already provides 1–4, 6, 8, 12, 16, 24; add if needed: `32: "8rem"`, `24: "6rem"` in `spacing` (or use arbitrary values `p-24` = 6rem).

### 4.2 Grid and layout

- **Grid:** 12-column.
- **Max content width:** 1280px (`max-w-7xl` or custom `max-w-[1280px]`).
- **Gutter:** 24px desktop, 16px mobile.
- **Margins:** 80px desktop, 24px mobile.
- **Layout:** Prefer asymmetric hierarchy over perfect symmetry.

### 4.3 Layout principles

- Thin rule lines: 1px, gold at ~20% opacity as dividers.
- Arched containers: top-only radius (e.g. `rounded-t-[999px]`) for Roman arch motif.
- Alternate full-bleed and contained sections for rhythm.
- Generous negative space.

---

## 5. Borders and geometry

### 5.1 Border styles

```css
/* Primary — gold, subtle */
border: 1px solid rgba(237, 199, 83, 0.2);
/* Secondary — stone */
border: 1px solid rgba(176, 176, 176, 0.15);
/* Accent — gold, visible */
border: 1px solid rgba(237, 199, 83, 0.6);
/* Danger */
border: 1px solid rgba(210, 43, 43, 0.5);
```

Tailwind: use theme `border.border-gold` etc., or arbitrary: `border border-[rgba(243,227,107,0.2)]`.

### 5.2 Border radius

| Context | Value | Rationale |
|---------|--------|-----------|
| Cards, panels, buttons | 2px | Geometric, architectural |
| Pill / tag | 999px | Full round for contrast |
| Arch (top only) | 999px 999px 0 0 | Roman arch reference |
| Circular | 50% | Medallion / coin motif |

Tailwind: `rounded-sm` (2px), `rounded-full` (999px), `rounded-t-[999px]` for arch.

### 5.3 Ornamental characters

Use sparingly as accents:

| Symbol | Unicode | Usage |
|--------|---------|--------|
| ✦ | U+2726 | Section dividers, list bullets |
| ◆ | U+25C6 | Diamond separators in headings |
| ✧ | U+2727 | Decorative accents |
| ✴ | U+2734 | Featured/highlight items |
| — | U+2014 | Em dash, editorial |
| · | U+00B7 | Midpoint in metadata |

Primary ornamental motif: thin-line 8-point starburst SVG — section headers, featured badges, loading/empty states.

---

## 6. Component patterns

### 6.1 Buttons

**Primary CTA**

- Background: `#EDC753` (accent gold)
- Text: `#0D0D0D`
- Font: Inter 500, 13px, letter-spacing 0.08em, UPPERCASE
- Border-radius: 2px
- Padding: 12px 28px
- Hover: background `#E6FF4D` (highlight yellow)

Tailwind example: `bg-accent-gold text-bg-primary font-body font-medium text-[13px] uppercase tracking-cta rounded-sm px-7 py-3 hover:bg-highlight transition-colors duration-[120ms]`.

**Secondary / ghost**

- Background: transparent
- Border: 1px solid `rgba(237, 199, 83, 0.5)`
- Text: `#EDC753`
- Hover: background `rgba(237, 199, 83, 0.08)`

**Danger**

- Background: transparent
- Border: 1px solid `rgba(210, 43, 43, 0.6)`
- Text: `#D22B2B`
- Hover: background `rgba(210, 43, 43, 0.1)`

### 6.2 Cards / panels

**Standard card**

- Background: `#141414`
- Border: 1px solid `rgba(237, 199, 83, 0.12)`
- Border-radius: 2px
- Padding: 24px
- Hover: border `rgba(237, 199, 83, 0.3)`

**Elevated panel**

- Background: `#1A1A1A`
- Border: 1px solid `rgba(176, 176, 176, 0.1)`
- Box-shadow: `0 0 40px rgba(0, 0, 0, 0.6)`

**Arch card**

- Border-radius: 999px 999px 0 0
- Use for featured content, profile cards, hero elements

### 6.3 Dividers

**Section divider**

- Height: 1px
- Background: `linear-gradient(90deg, transparent, rgba(237, 199, 83, 0.3), transparent)`

**Ornamental divider**

- Pattern: ——— ✦ ———
- Color: `#B0B0B0`, font Cinzel, centered

### 6.4 Tags / labels

- Background: `rgba(237, 199, 83, 0.1)`
- Border: 1px solid `rgba(237, 199, 83, 0.25)`
- Text: `#EDC753`, Inter 500, 11px, UPPERCASE, letter-spacing 0.1em
- Border-radius: 2px
- Padding: 3px 8px

Status variants: Active (gold), Warning (yellow tint), Error (red tint), Neutral (stone).

### 6.5 Navigation

- Background: `rgba(13, 13, 13, 0.95)`, `backdrop-blur: 12px`
- Border-bottom: 1px solid `rgba(237, 199, 83, 0.1)`
- Links: Inter 500, 13px, UPPERCASE, letter-spacing 0.08em, color `#B0B0B0`
- Active: color `#EDC753`, thin gold underline
- Logo: Cinzel, gold

### 6.6 Form inputs

- Background: `#141414`
- Border: 1px solid `rgba(176, 176, 176, 0.2)`
- Border-radius: 2px
- Text: `#F5F5F5`, Inter 400, 15px
- Placeholder: `#B0B0B0`
- Focus: border `rgba(237, 199, 83, 0.6)`, ring `0 0 0 3px rgba(237, 199, 83, 0.08)`
- Label: Inter 500, 12px, UPPERCASE, letter-spacing 0.08em, color `#B0B0B0`

---

## 7. Motion and animation

### 7.1 Principles

- **Slow and weighty** — marble, not paper.
- Default easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo).
- Entrances: fade + subtle translate up (e.g. 8–12px → 0).
- No bouncy springs.
- Stagger list items ~50ms for rhythm.

### 7.2 Duration scale

| Token | Duration | Usage |
|-------|----------|--------|
| fast | 120ms | Micro (button hover) |
| base | 200ms | Standard hover |
| slow | 350ms | Entrances, panel open |
| deliberate | 600ms | Page/hero transitions |

### 7.3 Standard transitions

```css
/* Button hover */
transition: background-color 120ms ease, border-color 200ms ease, color 120ms ease;

/* Card hover */
transition: border-color 200ms cubic-bezier(0.16, 1, 0.3, 1);

/* Panel/modal entrance */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: fadeInUp 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;

/* Stagger children: delay 0, 50, 100, 150ms for nth-child(1–4) */
```

Tailwind: `transition-colors duration-[120ms]`, `duration-200`, `duration-300`, `ease-out`; use `@keyframes` in CSS or Tailwind `animation` config.

### 7.4 Reduced motion

Respect `prefers-reduced-motion: reduce` — disable or shorten animations when set.

---

## 8. Iconography

- **Library:** Lucide React.
- **Stroke:** 1.5px default.
- **Sizes:** 16px (UI), 20px (feature), 24px (display).
- **Color:** Gold primary actions, stone secondary, red danger.
- **Ornamental:** Custom SVG starbursts/diamonds for decoration only.

---

## 9. Texture and depth

- **Noise:** SVG noise filter on hero backgrounds, opacity ~0.03.
- **Image overlay:** `linear-gradient(to bottom, transparent 40%, #0D0D0D 100%)`.
- **Vignette:** Radial gradient from transparent center to dark edges on full-bleed.
- **Gold glow:** `box-shadow: 0 0 24px rgba(237, 199, 83, 0.15)` on featured elements.
- **Layering:** `#0D0D0D` → `#141414` → `#1A1A1A` for depth.

---

## 10. Accessibility

- **Contrast:** Minimum 4.5:1 body, 3:1 large text (WCAG AA).
  - Off-White on Deep Charcoal ~18:1 ✓
  - Gold on Deep Charcoal ~11:1 ✓
  - Stone on Deep Charcoal ~7:1 ✓
- **Focus ring:** `outline: 2px solid #EDC753; outline-offset: 3px`.
- **Meaning:** Never rely on color alone — pair with icon or text.
- **Reduced motion:** Honor `prefers-reduced-motion` (see §7.4).

---

## 11. Voice and tone (copy)

- **Headings:** Short, declarative, often uppercase (e.g. "ENTER THE ARCHIVE").
- **Body:** Clear, direct, no filler.
- **Labels/CTAs:** Imperative (EXPLORE, SUBMIT, VIEW RECORD).
- **Errors:** Factual, not apologetic ("Authentication failed.").
- **Avoid:** Exclamation points, emoji in UI, casual slang, hedging.

---

## 12. Do / don’t

| Do | Don’t |
|----|--------|
| Cinzel for display headings | Cinzel for body text |
| Gold sparingly for impact | Gold on every element |
| Generous whitespace | Crowded layouts |
| Thin 1px borders | Thick borders or heavy shadows |
| Slow, weighty motion | Bouncy or playful animation |
| Uppercase for labels and CTAs | All-caps for body paragraphs |
| Deep Red for critical states only | Red used decoratively |
| Layered backgrounds (#0D → #1A) | Flat identical backgrounds |
| Geometric motifs (arches, circles) | Organic or bubbly shapes |
| Let classical imagery breathe | Crop or clutter imagery |

---

## 13. Implementation checklist (Next.js + Tailwind)

Use this when applying the design system to the codebase:

1. **globals.css:** Add `:root` CSS variables (§2.3); set `body` to `background: var(--color-bg-primary)`, `color: var(--color-text-primary)`.
2. **tailwind.config.ts:** Extend `theme` with colors (§2.4), fontFamily (§3.6), fontSize, letterSpacing; add animation keyframes if needed (§7.3).
3. **lib/fonts.ts:** Add next/font exports (§3.2); in `app/layout.tsx` apply font variables to `<html>` and use `font-body` (or equivalent) on `<body>`.
4. **Components:** Use semantic classes from the theme (e.g. `bg-bg-primary`, `text-accent-gold`, `font-display`, `text-display-md`) and the component patterns above (§6).
5. **Motion:** Use `transition-*` and duration classes; define `fadeInUp` in Tailwind config or globals.css; respect `prefers-reduced-motion` in media queries or a utility class.
