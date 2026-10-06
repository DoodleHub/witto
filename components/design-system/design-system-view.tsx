"use client";

import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { HintRow } from "@/components/ui/hint-row";
import {
  BackspaceIcon,
  CheckIcon,
  ClockIcon,
  CrownIcon,
  FlameIcon,
  HomeIcon,
  MoonIcon,
  PodiumIcon,
  ShuffleIcon,
  WittoMark,
  SunIcon,
  TYPE_ICONS,
} from "@/components/ui/icons";
import { Overline } from "@/components/ui/overline";
import { TextInput } from "@/components/ui/text-input";
import { CHALLENGE_TYPES, TYPE_META } from "@/lib/challenges";

const COLOR_GROUPS: { name: string; tokens: [string, string][] }[] = [
  {
    name: "Surfaces",
    tokens: [
      ["canvas", "Page background"],
      ["surface", "Cards, inputs"],
      ["surface-muted", "Hover, quiet fills"],
      ["brand-subtle", "Challenge card wash"],
      ["track", "Empty states, tiles"],
      ["block", "Crossword blocks"],
    ],
  },
  {
    name: "Text & lines",
    tokens: [
      ["ink", "Primary text"],
      ["ink-secondary", "Body, labels"],
      ["ink-muted", "Meta, captions"],
      ["ink-faint", "Placeholders, disabled"],
      ["line", "Hairlines"],
      ["line-strong", "Input borders"],
    ],
  },
  {
    name: "Brand",
    tokens: [
      ["brand", "Primary actions"],
      ["brand-hover", "Hover"],
      ["brand-press", "Pressed"],
      ["brand-ink", "Links, chip text"],
      ["brand-soft", "Chips, selection"],
      ["brand-line", "Brand borders"],
    ],
  },
  {
    name: "Feedback & game",
    tokens: [
      ["success", "Solved"],
      ["danger", "Wrong answer"],
      ["warning", "Caution"],
      ["tile-correct", "Right spot"],
      ["tile-present", "Wrong spot"],
      ["tile-absent", "Not in word"],
    ],
  },
  {
    name: "Categories",
    tokens: [
      ["cat-1", "Group 1 · Avatars"],
      ["cat-2", "Group 2"],
      ["cat-3", "Group 3"],
      ["cat-4", "Group 4"],
    ],
  },
];

const TYPE_SCALE = [
  { name: "Display", spec: "Source Serif 4 · 600 · 52/56 · −2.5%", sample: "A little challenge.", cls: "font-serif text-display font-semibold" },
  { name: "Headline", spec: "Source Serif 4 · 600 · 44/48 · −2.5%", sample: "Think outside the box.", cls: "font-serif text-headline font-semibold" },
  { name: "Title", spec: "Source Serif 4 · 600 · 30/34 · −2%", sample: "Who's sharpest today?", cls: "font-serif text-title font-semibold" },
  { name: "Lead", spec: "Figtree · 400 · 22/32", sample: "What has keys but no locks?", cls: "text-lead" },
  { name: "Body", spec: "Figtree · 400 · 16/24", sample: "One fresh puzzle, every day.", cls: "text-base" },
  { name: "Label", spec: "Figtree · 600 · 15/20", sample: "5 day streak", cls: "text-[15px] font-semibold" },
  { name: "Caption", spec: "Figtree · 400 · 13/18", sample: "Keep it going!", cls: "text-[13px] text-ink-secondary" },
  { name: "Overline", spec: "Figtree · 500 · 13/16 · +10% · caps", sample: "Saturday, October 3", cls: "text-overline font-medium uppercase tracking-[0.1em] text-ink-secondary" },
];

const SPACING = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
const RADII = [
  ["sm", "8px", "Small controls"],
  ["md", "12px", "Keys, tiles"],
  ["lg", "16px", "Inputs, buttons"],
  ["2xl", "22px", "Cards"],
  ["full", "999px", "Chips, avatars"],
];

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-line pt-10 sm:pt-14">
      <h2 className="font-serif text-title font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-[620px] text-ink-secondary">{intro}</p>
      <div className="mt-6 sm:mt-8">{children}</div>
    </section>
  );
}

function Specimen({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function ThemePanel({ theme }: { theme: "light" | "dark" }) {
  return (
    <div data-theme={theme} className="rounded-2xl border border-line bg-canvas p-5 text-ink sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
          {theme === "light" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          {theme === "light" ? "Light" : "Dark"}
        </span>
        <Overline>Saturday, October 3</Overline>
      </div>
      <Card variant="challenge" className="p-5">
        <Chip>Today&apos;s challenge · Riddle</Chip>
        <p className="mt-4 font-serif text-[28px] font-semibold leading-tight tracking-[-0.02em]">Think outside the box.</p>
        <p className="mt-2 text-ink">What gets wetter the more it dries?</p>
        <div className="mt-4 flex gap-2">
          <TextInput placeholder="Your answer" readOnly />
          <Button>Submit</Button>
        </div>
      </Card>
      <Card className="mt-3 flex items-center gap-3 px-4 py-3">
        <FlameIcon size={26} />
        <div className="flex-1">
          <p className="text-sm font-semibold">5 day streak</p>
          <p className="text-xs text-ink-secondary">Keep it going!</p>
        </div>
        <div className="flex gap-1.5">
          {[1, 1, 1, 0, 2].map((s, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full",
                s === 1 ? "bg-brand text-on-brand" : s === 0 ? "border-2 border-brand" : "border border-line bg-track",
              )}
            >
              {s === 1 && <CheckIcon size={13} />}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function DesignSystemView() {
  const [hintUsed, setHintUsed] = useState(false);

  return (
    <div className="mx-auto max-w-[1040px] px-4 pb-16 pt-8 sm:px-8 sm:pt-14">
      <header>
        <div className="flex items-center gap-3">
          <WittoMark size={40} />
          <Overline>witto · Design system v1</Overline>
        </div>
        <h1 className="mt-5 font-serif text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-display">
          Calm, clever, a little bit delightful.
        </h1>
        <p className="mt-4 max-w-[640px] text-lg text-ink-secondary">
          The building blocks behind witto&apos;s daily challenge. Warm paper neutrals, one confident violet, an
          editorial serif for moments that matter and a friendly sans for everything else. Every color is a semantic
          token with a light and a dark value.
        </p>
        <nav className="mt-6 flex flex-wrap gap-2 text-sm">
          {["Themes", "Color", "Typography", "Layout", "Components", "Iconography"].map((s) => (
            <a
              key={s}
              href={`#${s.toLowerCase()}`}
              className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-medium text-ink-secondary hover:border-brand-line hover:text-brand-ink"
            >
              {s}
            </a>
          ))}
        </nav>
      </header>

      <div className="mt-12 space-y-14 sm:space-y-20">
        <Section id="themes" title="Themes" intro="Both themes share one token set. Dark mode keeps the violet bright and drops shadows in favor of tonal surfaces. Users can follow the OS or pick a theme from the header; the choice is applied before first paint.">
          <div className="grid gap-4 md:grid-cols-2">
            <ThemePanel theme="light" />
            <ThemePanel theme="dark" />
          </div>
        </Section>

        <Section id="color" title="Color" intro="Components only reference semantic tokens (bg-surface, text-ink-secondary, border-brand-line…). Each swatch shows the light value on the left and the dark value on the right.">
          <div className="space-y-8">
            {COLOR_GROUPS.map((group) => (
              <div key={group.name}>
                <p className="mb-3 text-sm font-semibold text-ink">{group.name}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {group.tokens.map(([token, role]) => (
                    <div key={token} className="overflow-hidden rounded-xl border border-line bg-surface">
                      <div className="flex h-16">
                        <div data-theme="light" className="flex-1" style={{ background: `var(--${token})` }} />
                        <div data-theme="dark" className="flex-1" style={{ background: `var(--${token})` }} />
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="font-mono text-xs font-semibold text-ink">{token}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="typography" title="Typography" intro="Source Serif 4 carries headlines with tight tracking. Figtree handles UI and reading text. Sizes step down on small screens; the serif never goes below 28px.">
          <Card className="divide-y divide-line">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="flex flex-col gap-2 px-5 py-5 sm:flex-row sm:items-baseline sm:gap-8 sm:px-7">
                <div className="sm:w-56 sm:shrink-0">
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="font-mono text-xs text-ink-muted">{t.spec}</p>
                </div>
                <p className={cn("min-w-0 text-ink", t.cls)}>{t.sample}</p>
              </div>
            ))}
          </Card>
        </Section>

        <Section id="layout" title="Layout" intro="A 4px base grid. Content sits in an 884px column on desktop and a 16px gutter on phones. Cards use generous padding (48px desktop, 24px mobile).">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-1">
              <p className="mb-4 text-sm font-semibold">Spacing</p>
              <div className="space-y-2">
                {SPACING.map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-8 font-mono text-xs text-ink-muted">{s}</span>
                    <span className="h-3 rounded-sm bg-brand-soft" style={{ width: s * 2.5 }} />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold">Radius</p>
              <div className="grid grid-cols-3 gap-3">
                {RADII.map(([name, value, use]) => (
                  <div key={name} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="size-14 border-2 border-brand bg-brand-subtle" style={{ borderRadius: value }} />
                    <span className="font-mono text-xs font-semibold">{name}</span>
                    <span className="text-[11px] leading-tight text-ink-muted">{use}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold">Elevation</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["shadow-sm", "shadow-sm", "Inputs, keys"],
                  ["shadow-md", "shadow-md", "Menus"],
                  ["shadow-card", "shadow-card", "Challenge card"],
                  ["shadow-brand", "shadow-brand", "Primary button"],
                ].map(([cls, name, use]) => (
                  <div key={name} className="flex flex-col gap-2">
                    <span className={cn("h-14 rounded-xl border border-line bg-surface", cls)} />
                    <span className="font-mono text-xs font-semibold">{name}</span>
                    <span className="-mt-1.5 text-[11px] text-ink-muted">{use}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        <Section id="components" title="Components" intro="Small, composable primitives in components/ui. Game components are built from these plus the game tile tokens.">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="space-y-6 p-6">
              <Specimen label="Button · primary">
                <Button size="lg">Submit answer</Button>
                <Button>Enter</Button>
                <Button size="sm">Small</Button>
                <Button disabled>Disabled</Button>
              </Specimen>
              <Specimen label="Button · secondary & ghost">
                <Button variant="secondary">Shuffle</Button>
                <Button variant="secondary" aria-label="Delete">
                  <BackspaceIcon size={20} />
                </Button>
                <Button variant="ghost">Reveal all</Button>
              </Specimen>
            </Card>
            <Card className="space-y-6 p-6">
              <Specimen label="Text input">
                <TextInput size="lg" placeholder="Your answer" />
              </Specimen>
              <Specimen label="Text input · invalid">
                <TextInput invalid defaultValue="piano" />
              </Specimen>
            </Card>
            <Card className="space-y-6 p-6">
              <Specimen label="Chip">
                <Chip>Today&apos;s challenge · Riddle</Chip>
                <Chip tone="neutral">Preview</Chip>
                <Chip tone="success">Solved</Chip>
                <Chip tone="danger">Missed</Chip>
              </Specimen>
              <Specimen label="Avatar">
                <Avatar name="You" you size={40} />
                {[0, 1, 2, 3].map((t) => (
                  <Avatar key={t} name={["Maya Okafor", "Theo L", "Priya Raman", "Jun Park"][t]} tone={t} size={40} />
                ))}
              </Specimen>
              <Specimen label="Hint row">
                <HintRow used={hintUsed} onHint={() => setHintUsed(true)} hint="You might be looking right at it." />
              </Specimen>
            </Card>
            <Card className="space-y-6 p-6">
              <Specimen label="Streak day · played / today / upcoming">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand text-on-brand">
                  <CheckIcon size={18} />
                </span>
                <span className="inline-flex size-9 rounded-full border-2 border-brand bg-surface" />
                <span className="inline-flex size-9 rounded-full border border-line bg-track" />
              </Specimen>
              <Specimen label="Word tiles · correct / present / absent / typed / empty">
                {[
                  ["W", "bg-tile-correct border-tile-correct text-white"],
                  ["I", "bg-tile-present border-tile-present text-white"],
                  ["T", "bg-tile-absent border-tile-absent text-white"],
                  ["T", "border-ink-muted bg-surface text-ink"],
                  ["", "border-line-strong bg-surface/70"],
                ].map(([ch, cls], i) => (
                  <span key={i} className={cn("flex size-12 items-center justify-center rounded-lg border-2 text-xl font-bold", cls)}>
                    {ch}
                  </span>
                ))}
              </Specimen>
              <Specimen label="Connection groups">
                {["bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4"].map((c, i) => (
                  <span key={c} className={cn("rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink", c)}>
                    Group {i + 1}
                  </span>
                ))}
              </Specimen>
            </Card>
            <Card variant="challenge" className="p-6 lg:col-span-2">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Card · challenge</p>
              <p className="font-serif text-headline font-semibold">Think outside the box.</p>
              <p className="mt-2 text-lead text-ink">The challenge card is the one place we use the violet wash and the lifted shadow.</p>
            </Card>
          </div>
        </Section>

        <Section id="iconography" title="Iconography" intro="Line icons on a 24px grid with a 1.6px stroke and round caps. Color comes from currentColor. Two filled marks, the sparkle and the flame, are reserved for brand and streak moments.">
          <Card className="p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Challenge types</p>
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-7">
              {CHALLENGE_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t];
                return (
                  <div key={t} className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-14 items-center justify-center rounded-xl bg-surface-muted text-ink-secondary">
                      <Icon size={28} />
                    </span>
                    <span className="text-xs text-ink-secondary">{TYPE_META[t].label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mb-4 mt-8 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Interface & brand</p>
            <div className="flex flex-wrap items-center gap-5 text-ink-secondary">
              <WittoMark size={32} />
              <FlameIcon size={32} />
              <HomeIcon size={26} />
              <PodiumIcon size={26} />
              <CheckIcon size={26} />
              <ShuffleIcon size={26} />
              <BackspaceIcon size={26} />
              <ClockIcon size={26} />
              <CrownIcon size={26} />
              <SunIcon size={26} />
              <MoonIcon size={26} />
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
