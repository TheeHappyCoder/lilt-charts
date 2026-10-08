# Docs UI

These components belong to `apps/showcase`. They use the existing Base UI, Motion, and Hugeicons dependencies. The chart package does not import them. They are local components for now; there is no new package or publish step.

The chart cards' built-in `Period` selector is rendered by `packages/charts` and remains native. Use this layer for docs-owned controls. A future custom range renderer would need an independent chart API seam, keeping Base UI inside the app and generated examples aligned with their previews.

`surface.css` is imported once in the root layout. Floating surfaces stay dark in either site theme, following NovaCore's component style. The accent and focus ring use Lilt's existing variables. All new surface and motion tokens are scoped under `--lilt-ui-*`. `TooltipProvider` in the layout shares the hint delay across controls.

Import individual files or use `@/components/ui`. Base UI props, refs, `render` composition, state class callbacks, controlled state, and change-event details pass through. A popup's `positionerProps` and `portalProps` provide positioning/portal overrides. `SelectPopup` places the list below its trigger by default and can opt into item alignment with `positionerProps={{ alignItemWithTrigger: true }}`.

## Select

For a docs setting, use the labeled helper:

```tsx
import { SelectField } from '@/components/ui/select';

<SelectField
  label="Loading style"
  value={loadingStyle}
  onValueChange={setLoadingStyle}
  options={[
    { value: 'shimmer', label: 'Shimmer' },
    { value: 'draw', label: 'Draw' },
    { value: 'breathe', label: 'Breathe' },
  ]}
/>;
```

For custom composition, use `Select`, `SelectTrigger`, `SelectValue`, `SelectPopup`, and `SelectItem`. Pass the option array as `items` on `Select` so the value displays its label. Groups, separators, disabled items, multiple selection, forms, and Base UI's generic values remain available.

## Pill select

```tsx
import { PillSelect } from '@/components/ui/pill-select';

<PillSelect
  label="Typeface"
  leading="Aa"
  value={face}
  onValueChange={setFace}
  options={[
    { value: 'manrope', label: 'Manrope' },
    { value: 'geist', label: 'Geist' },
  ]}
/>;
```

A compact glass pill for a floating setting, such as a corner switcher. It wraps a native select, so keyboard, screen reader, and mobile pickers come with it, and other select attributes (`name`, `disabled`, `id`) pass through. `label` is the accessible name and stays visually hidden; `leading` is an optional visible cue. The caller positions it. Styles live in `pill-select.css`, imported once in the root layout, with tokens scoped under `--lilt-ui-pill-select-*`. Reduced transparency swaps the glass for a solid fill.

## Dropdown

```tsx
import { Button } from '@/components/ui/button';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from '@/components/ui/menu';

<Menu>
  <MenuTrigger render={<Button />}>Chart options</MenuTrigger>
  <MenuPopup>
    <MenuItem onClick={copySettings}>Copy settings</MenuItem>
    <MenuItem disabled>Export image</MenuItem>
  </MenuPopup>
</Menu>;
```

Checkbox and radio items, submenus, groups, separators, and destructive items are included. Use `render={<Link href="…" />}` to keep link semantics. `closeOnClick={false}` keeps a choice menu open while the reader changes settings.

## Tooltip

```tsx
import { TooltipHint } from '@/components/ui/tooltip';

<TooltipHint content="Replay animation">
  <button type="button" aria-label="Replay animation" onClick={replay}>
    <Icon icon={ReplayIcon} aria-hidden="true" size={14} />
  </button>
</TooltipHint>;
```

The hint composes onto the actual control without adding a wrapper or a second button. Keep the control's accessible name; a tooltip is supplementary. Rich interactive content belongs in a popover. Compound tooltip parts are exported for advanced cases.

The provider shares one hint surface across its triggers. The first pointer hover waits 400ms; adjacent hints and quick follow-ups use Base UI's instant phase. The bubble travels and resizes in 160ms. Opening and swapping text use a 150ms fade with 2px of blur. Moving right brings the next text from the right, moving left into place; moving back reverses it. Base UI supplies the direction, collision handling, current/previous content, and timing. Reduced motion removes the travel, blur, scale, and transitions. Callers continue using `TooltipHint` without adding toolbar wrappers. A hint outside a provider keeps its standalone fallback.

`TooltipHint` connects the popup with `aria-describedby` while it is open and preserves an existing description. For compound tooltips, connect the trigger's `aria-describedby` with the popup's `id` explicitly.

`IconSwap` keeps both glyphs in one fixed slot and crossfades their opacity, blur, and scale in both directions. The docs copy buttons and homepage install copy use it for Copy → Tick → Copy. Its scoped tokens live in `icon-swap.css`; reduced motion removes the transition.

## Popover

The exported `Popover` namespace preserves the Base UI compound shape. Existing docs only need to replace `@base-ui/react/popover` with `@/components/ui/popover`. `Popover.Popup` adds the shared surface and motion without changing the markup. `PopoverContent` is a convenience combining portal, positioner, and popup.

## Command

```tsx
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';

<Command items={pages} itemToStringValue={(page) => page.label}>
  <CommandInput aria-label="Search documentation" placeholder="Search documentation…" />
  <CommandEmpty>No matching pages.</CommandEmpty>
  <CommandList>
    {(page) => (
      <CommandItem key={page.href} value={page} onClick={() => openPage(page.href)}>
        {page.label}
      </CommandItem>
    )}
  </CommandList>
</Command>;
```

Put this inside `CommandDialog` / `CommandDialogPopup` for a modal palette. The popup provides its accessible title and Base UI handles focus containment, return focus, and Escape. Consumers decide how commands navigate and whether a keyboard shortcut opens them. No global shortcut or navigation redesign is installed by these primitives.

For sections, pass `CommandGroupedList` the same objects used by the root's flat `items` array, grouped into `{ label, items }` sections. It retains section order and hides headings with no matches. The ready-to-use `DocsCommand` in `components/docs/docs-command.tsx` groups navigation into Charts, Finance, Features, Lab, and Learn, matching the sidebar. It accepts `onSelect(route)` so callers own navigation and closing the dialog.

`components/shell/docs-search.tsx` connects both sidebar search buttons to one `DocsCommand` dialog. It owns ⌘K / Ctrl+K, navigation, and focus. Mobile search closes the navigation drawer before opening the palette and returns focus to the menu button when dismissed. Search starts empty each time; sidebar sections retain their collapse state.

## Shared hover

Select, Menu, and Command automatically share one traveling highlight per list. Base UI's highlighted state drives both pointer and keyboard navigation. Disabled options cannot activate and do not receive a hover highlight; filtered or removed rows clear stale highlights. Motion respects reduced motion. The existing tabs and Lab option groups use the same highlight while retaining their selected indicators.

For an existing button group, keep its semantics and layout and wrap its buttons in `TravelingHighlightScope activationMode="pointer-and-focus"`. Give each button a unique `data-lilt-highlight` value and insert `TravelingHighlightTarget itemId={value}` inside it. This is used by the current preview State and Loading style controls.

## Review and merging

Component code and styling live together in this directory. Existing docs integrations are small imports and composition changes. Keep layout work in the existing docs files; extend this layer when another control needs the same interaction. No edits to `docs.css`, `studio.css`, generated examples, or chart geometry are required to adopt it.
