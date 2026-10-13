---
name: Vibrant Talent Infrastructure
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#494456'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#7a7488'
  outline-variant: '#cac3d9'
  surface-tint: '#6826fa'
  primary: '#4200b2'
  on-primary: '#ffffff'
  primary-container: '#5b00ee'
  on-primary-container: '#ccbcff'
  inverse-primary: '#cdbdff'
  secondary: '#aa00a6'
  on-secondary: '#ffffff'
  secondary-container: '#fd2af6'
  on-secondary-container: '#540052'
  tertiary: '#4a00aa'
  on-tertiary: '#ffffff'
  tertiary-container: '#650ce0'
  on-tertiary-container: '#d1bbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e7deff'
  primary-fixed-dim: '#cdbdff'
  on-primary-fixed: '#1f005f'
  on-primary-fixed-variant: '#4f00d1'
  secondary-fixed: '#ffd7f4'
  secondary-fixed-dim: '#ffabf1'
  on-secondary-fixed: '#380037'
  on-secondary-fixed-variant: '#82007f'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d1bcff'
  on-tertiary-fixed: '#24005b'
  on-tertiary-fixed-variant: '#5800c8'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 3.5rem
    fontWeight: '800'
    lineHeight: 4rem
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '800'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system drives an elevated, human-centric recruitment and talent management platform. The brand identity balances high-energy modern tech appeal with operational clarity and institutional trust. It serves two distinct user personas: ambitious job applicants seeking seamless career progression and hiring managers/recruiters managing high-volume candidate pipelines.

The aesthetic blends **Modern Corporate** efficiency with **High-Contrast Electric Accents**:
- **Energy & Modernity:** Bold electric violet anchors primary navigation, structural action states, and brand identifiers, paired with hyper-saturated electric magenta for badges, active milestones, and focal calls-to-action.
- **Operational Precision:** High-density, crystal-clear workspaces built on cool slate neutrals, generous line spacing, clean borders, and crisp visual hierarchy that eliminate cognitive fatigue during prolonged recruiting sessions.
- **Lowercase Brand Rhythm:** Emulating the signature brand logotype, major marketing headings and hero section titles celebrate lowercase, tight-tracking geometric typography, transitioning to clean, balanced sentence-case formatting across data tables, candidate records, and forms.

## Colors

The palette leverages electric jewel tones grounded by cool institutional slates to establish distinct functional tiers:

- **Primary Electric Violet (`#5B00EE`):** The primary anchor used for critical system actions, primary interactive states, branded top headers, and active pipeline statuses. Hover states shift slightly deeper (`#4A00C2`), while selected containers utilize a faint violet wash (`#F4EFFF`).
- **Secondary Electric Magenta (`#EB00E6`):** A high-voltage accent reserved for key indicators, application submission triggers, candidate spotlight badges, and urgent hiring tags. Never overused as a large background surface; instead, it acts as a laser-focused highlighter.
- **Tertiary Accent / Mid-Violet (`#7A35F4`):** Bridges primary violet and slate text, perfect for secondary badge backgrounds, chart metrics, and interactive focus borders.
- **Neutral Surface & Typography Hierarchy:**
  - Base Background: Pure canvas white (`#FFFFFF`) layered over cool light slate backgrounds (`#F8F9FC`, `#F1F3F9`) for cards and pipeline columns.
  - Border & Dividers: Deliberate, soft slate borders (`#E2E8F0`, `#EAECF0`) to establish grid structure without harsh visual clutter.
  - Text Hierarchy: Slate Black (`#0F172A`) for headlines and data labels, Slate Neutral (`#475569`) for metadata and form descriptions, and Slate Muted (`#94A3B8`) for placeholders and inactive icons.
- **Feedback & Semantics:**
  - Success: `#059669` (Interview Passed / Offer Accepted)
  - Warning: `#D97706` (Action Required / Review Pending)
  - Error: `#DC2626` (Rejected / Missing Credentials)
  - Info: `#2563EB` (Scheduled / In Review)

## Typography

The typography is powered exclusively by **Plus Jakarta Sans**, providing clean geometric purity with contemporary humanist openness. It mirrors the geometric lowercase curves seen in the brand identity.

- **Hero & Feature Headings:** May employ lowercase text styling (`text-transform: lowercase`) for brand campaigns, marketing intros, and welcome states, paired with tight negative letter tracking (`-0.03em`) to project confidence and cultural relevance.
- **Application Workflows & Tables:** Switch back to standard casing with strict optical vertical alignment. Candidate names, stage indicators, and interview notes utilize `label-lg` and `body-sm` for high-density legibility.
- **Number Metrics:** Tabular figures (`font-variant-numeric: tabular-nums`) must be applied across recruitment dashboards, salary band visualizations, and ATS pipeline columns to guarantee flawless numeric vertical alignment.

## Layout & Spacing

This design system uses a responsive 12-column fluid grid system on desktop that gracefully collapses into tablet and mobile viewports:

- **Desktop (1280px+):** 12-column layout with `2rem` page margin and `1.5rem` gutters. Recruiter workspaces support a dual-pane or tri-pane layout (Navigation Drawer, Stage Columns/List View, and Detailed Applicant Drawer).
- **Tablet (768px - 1023px):** 8-column layout with `1.5rem` margin. Complex candidate tables transition into horizontally swipeable cards or collapsible accordions.
- **Mobile (< 767px):** 4-column layout with `1rem` margin and `1rem` gutter. Candidate boards collapse into vertical stacked stage tabs, prioritizing single-thumb quick actions (Shortlist, Message, Reject).

Layout spacing strictly adopts a mathematical 8pt rhythm (`0.25rem`, `0.5rem`, `1rem`, `1.5rem`, `2.5rem`). Dense elements like data rows use `space-sm` vertical padding to maximize screen real estate, while candidate profile overviews utilize `space-xl` containers for breathing room.

## Elevation & Depth

Visual hierarchy uses a refined combination of **tonal surface layering**, **crisp boundary borders**, and **subtle tinted ambient shadows**:

- **Level 0 (Flat Ground):** `#F8F9FC` serves as the canvas for dashboards, applicant tracking boards, and listing pages.
- **Level 1 (Card & Content Surface):** `#FFFFFF` paired with a delicate outline (`1px solid #E2E8F0`) and an ambient, low-opacity drop shadow tinted with slate: `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Interactive Floating / Hover Cards):** Used for draggable candidate tiles, active job cards, and dropdown panels: `0 4px 12px rgba(91, 0, 238, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)` with border transitioning to `#CBD5E1`.
- **Level 3 (Modals & Flyout Drawers):** Used for the candidate evaluation drawer, interview scheduler, and dialog boxes: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Focus Rings:** All keyboard-focused and active inputs receive a dual ring: a crisp `2px` white offset ring followed by a `2px` electric violet (`#5B00EE`) outer glow.

## Shapes

The design system adopts a **Rounded (`roundedness: 2`)** geometry:
- **Base Components (Inputs, Small Buttons, Badges):** Feature a `0.5rem` (8px) radius, giving buttons and inputs a modern, accessible, and friendly silhouette.
- **Cards, Modals & Containers (`rounded-lg`):** Scaled to `1rem` (16px) radius, delivering structured yet approachable surfaces that soften institutional hiring interfaces.
- **Floating Overlays & Drawer Panels (`rounded-xl`):** Scaled to `1.5rem` (24px) for hero dialogs and application modal headers.
- **Pills (`rounded-full`):** Reserved exclusively for applicant status chips (e.g., "Screening", "Offer Extended"), skill tags, and counter badges to create instant contrast against square layout cards.

## Components

### Buttons
- **Primary:** Solid `#5B00EE` background, crisp white typography (`label-lg`), `0.5rem` radius, `0.75rem 1.5rem` padding. Hover transitions to `#4A00C2`. Active state renders a subtle micro-depression scale of `0.98`.
- **Secondary / Action Accent:** Solid `#EB00E6` background, crisp white text. Used selectively for key conversion points like "Apply Now", "Make Offer", or "Publish Job".
- **Tertiary / Ghost:** Transparent background, slate text (`#475569`), border `1px solid #E2E8F0`. Hover triggers background `#F1F3F9` and text `#0F172A`.

### Status Badges & Chips
- **Pill Geometry:** Fully rounded (`rounded-full`), `0.25rem 0.75rem` padding, typography `label-md`.
- **Stage Chips:**
  - *Sourced / In Review:* `#F4EFFF` background, `#5B00EE` text.
  - *Interviewing:* `#FDF2F8` background, `#EB00E6` text.
  - *Offer Accepted:* `#ECFDF5` background, `#059669` text.
  - *Archived / Rejected:* `#F1F5F9` background, `#64748B` text.

### Form Inputs & Search Fields
- **Container:** Height `2.75rem` (44px) for mobile accessibility, `#FFFFFF` fill, border `1px solid #E2E8F0`, `0.5rem` border radius.
- **States:** Active typing state highlights border with `#5B00EE` and faint outer ring `rgba(91, 0, 238, 0.15)`. Error states swap border to `#DC2626`.
- **Search Bars:** Prefixed with a muted search icon (`#94A3B8`), supporting shortcut badge indicators (`Ctrl+K` / `⌘K`) in `label-sm`.

### Candidate & Job Cards
- **Structure:** White card (`#FFFFFF`), `1rem` radius, `1px solid #E2E8F0`, padded at `1.25rem`.
- **Layout:** Header features job title (`headline-sm`) with company or department pill on the right. Middle section lists compensation tags, remote status, and location in `body-sm`. Bottom bar includes applicant timestamp and quick action buttons.

### Checkboxes & Radio Controls
- **Size:** `1.125rem` (18px) square with `0.25rem` radius (checkbox) or circular (radio).
- **Active State:** Solid `#5B00EE` fill featuring an interior crisp white checkmark or dot. Hover state features a light violet aura.

### Recruiter Pipeline Columns (Kanban Boards)
- **Column Container:** Background `#F8F9FC`, border `1px solid #EAECF0`, `1rem` radius, header featuring stage title and pill counter (`label-md`).
- **Draggable Cards:** Clean white background, hover shadow elevation level 2, clear drag handle indicator, and compact metadata view.