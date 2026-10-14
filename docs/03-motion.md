# 03 — Motion

The brief asks for Apple- and Awwwards-level animation. In practice that means a small number of well-choreographed moments with precise easing, tied to scroll and to real state changes, and nothing that slows a payment down.

## Principles

1. **Motion explains state.** In checkout, each animation marks a real transition: connected, signing, confirming, paid.
2. **Spectacle on the landing page, restraint in the product.** The merchant app gets fast, quiet transitions. Nobody wants a dashboard that performs.
3. **Never block the user.** No animation delays an input, a tap, or the Approve button. Entrances finish within 600 ms on app screens.
4. **Transform and opacity only.** No animated layout properties, no animated `filter: blur` on large areas on mobile.
5. **Reduced motion is a first-class variant**, not an afterthought.

## Who does what

Two libraries, with a hard line between them so they never fight over the same element.

| Job                                                                                       | Tool                                |
| ----------------------------------------------------------------------------------------- | ----------------------------------- |
| Scroll-linked sequences, pinning, scrubbing                                               | GSAP ScrollTrigger                  |
| Headline line and word reveals                                                            | GSAP SplitText                      |
| Multi-step choreographed timelines (hero intro, success burst)                            | GSAP timeline                       |
| SVG illustration animation                                                                | GSAP                                |
| Smooth scroll, landing only                                                               | Lenis, driven from GSAP's ticker    |
| Mount and unmount, dialogs, sheets, menus, toasts                                         | Motion `AnimatePresence`            |
| Shared-element and layout transitions (tab pill, form step expanding, hero colour change) | Motion `layout` / `layoutId`        |
| Hover, press, drag (sheet drag-to-dismiss)                                                | Motion gestures                     |
| Number counting                                                                           | Motion `useSpring` + `useTransform` |

Rule: an element is owned by one library. GSAP animates a wrapper; Motion animates the component inside it, or the reverse. Never both on the same node.

## Setup

- `lib/motion/gsap.ts` registers ScrollTrigger and SplitText once, client-side, and sets defaults.
- All GSAP code runs inside `useGSAP` from `@gsap/react` with a `scope` ref, so it cleans up on unmount and on route change.
- Lenis is mounted in the `(marketing)` layout only. The merchant app and checkout use native scrolling; smooth-scroll hijacking inside an app or a payment form is a usability cost.
- Motion runs through `LazyMotion` with the `domMax` feature set (layout animations need it), loaded up front. Loading it lazily was tried and removed: the late update from the provider made React discard server-rendered HTML inside Suspense boundaries that were still streaming, and render it again on the client.
- GSAP is not imported anywhere under `/pay/[id]` until the state that needs it; the illustration timelines are dynamically imported.

## Tokens

| Name            | Value                             | Use                         |
| --------------- | --------------------------------- | --------------------------- |
| `duration.fast` | 150 ms                            | Hover, press                |
| `duration.base` | 300 ms                            | Menus, tabs, badges         |
| `duration.slow` | 600 ms                            | Sheets, page entrances      |
| `duration.hero` | 1000–1400 ms                      | Landing set pieces          |
| `ease.out`      | expo out `(0.16, 1, 0.3, 1)`      | Entrances                   |
| `ease.inOut`    | quart in-out `(0.76, 0, 0.24, 1)` | Moves, colour wipes         |
| `spring.ui`     | stiffness 400, damping 32         | Pills, sheets, buttons      |
| `spring.soft`   | stiffness 120, damping 20         | Counters, floating elements |
| `stagger`       | 60–80 ms                          | Lists, lines of text        |

## Reusable pieces (`components/motion`)

| Component        | Behaviour                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SplitHeading`   | Splits into lines, each masked and sliding up with stagger. Splits after fonts load, re-splits on resize, keeps the full text available to screen readers. |
| `Reveal`         | Fade and 24 px rise when entering the viewport, once.                                                                                                      |
| `Stagger`        | Applies `Reveal` to children in sequence.                                                                                                                  |
| `Parallax`       | Scrubbed translate at a given speed. Used on photography and device mockups.                                                                               |
| `ImageReveal`    | Clip-path wipe with a slight scale-down from 1.15, the standard editorial image entrance.                                                                  |
| `Magnetic`       | Button drifts toward the cursor. Pointer devices only.                                                                                                     |
| `CountUp`        | Spring-driven number, tabular figures, final value in the DOM for assistive tech.                                                                          |
| `PageTransition` | Short cross-fade and rise between merchant routes.                                                                                                         |

## Landing page

Section by section, top to bottom.

**Nav.** The `MENU` pill expands into the menu card with a shared-layout morph: the pill's background grows into the card, items stagger in. The dot in the pill becomes the close affordance.

**Hero.**

- Intro timeline on load: the photo container scales from 0.94 with corners easing from square to 32 px while the image inside scales down from 1.2; the headline rises line by line; subcopy and buttons follow; the two device mockups slide up from below at their tilted angle with a slight overshoot.
- The dashboard mockup's total counts up to `$4,250.00` as it lands.
- On scroll: the photograph moves slower than the page, the mockups move faster and rotate a few degrees toward flat. The hero container scales down slightly and fades as the next section arrives.
- Idle: mockups float on a slow 6 s loop, offset from each other.

**How it works.** This is the main set piece.

- Desktop: the section pins. The heading reveals, then the four cards (Create, Share, Customer pays, Payment verified) activate in sequence as the user scrolls. Each card's mini UI plays its own short loop when active: the amount types itself in, the QR code assembles module by module, the review sheet slides up under a lime header, the status banner flips to Paid.
- A thin progress line connects the four steps, echoing the PRD's `Create → Share → Customer Pays → Payment Verified`.
- Mobile: no pinning. Cards reveal one at a time as they scroll into view and play their loop once.

**Use cases.** Heading reveals by line. The four columns draw their dividers top to bottom, then text staggers in. On hover, a column's divider turns `brand`.

**Verification showcase.** The right-hand column in the comps is a vertical stack of checkout states cropped mid-scroll. Built as a pinned panel whose inner stack scrolls through Expired, Processing and Paid while the left copy stays put. The progress bar in the Processing card fills in step with scroll, and the clock hand rotates.

**CTA band.** The purple band expands from an inset card to nearly full-bleed as it enters. Mockups parallax in from the right. The button is magnetic.

**Footer.** Simple stagger reveal. The large wordmark, if added, reveals by letter.

## Checkout (`/pay/[id]`)

Mobile first. Everything here must run at 60 fps on a mid-range Android phone.

| Moment                           | Animation                                                                                                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page load                        | Hero colour is present immediately (no flash). The amount rises and fades in; leaf shapes drift in from the right; the detail sheet slides up from the bottom edge with `spring.ui`. Total under 700 ms.                                                                   |
| Leaf shapes                      | Slow idle drift and rotation, a few pixels of parallax on device tilt or pointer move.                                                                                                                                                                                     |
| Connect wallet                   | Bottom sheet springs up over a dimmed backdrop, draggable to dismiss. Wallet options stagger in.                                                                                                                                                                           |
| Wallet connected                 | The primary button label cross-fades from `Connect Stellar Wallet` to `Review payment`; a Wallet row grows into the detail list with a layout animation.                                                                                                                   |
| Review                           | The sheet's content cross-fades from details to review rows; the sheet resizes with a layout animation instead of jumping.                                                                                                                                                 |
| Waiting for signature            | The lock illustration slides in from the right edge of the hero. With layered SVG: the shackle lifts and settles in a loop, the characters bob. The progress bar shows an indeterminate segment.                                                                           |
| Processing                       | Lock exits, clock enters. The clock hand sweeps continuously; the progress bar advances with an eased, asymptotic fill that never reaches 100% until the backend confirms.                                                                                                 |
| Success                          | The signature moment. The hero colour wipes from `brand` to lime as a circular reveal expanding from the amount; the chip flips to `Paid`; the leaf shapes recolour; a single haptic tick where supported (`navigator.vibrate`); the receipt rows stagger in. No confetti. |
| Failed                           | Hero wipes to `danger` with a short horizontal shake of the sheet (6 px, two cycles). The reason banner fades in.                                                                                                                                                          |
| Expired, not found, already paid | Static state colour from first paint. Entrance fade only.                                                                                                                                                                                                                  |

The hero colour change is one element with an animated clip-path overlay, not a background-colour tween, so it reads as a wipe and stays on the compositor.

## Merchant app

Quiet and quick.

| Moment                       | Animation                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route change                 | 200 ms fade and 8 px rise of the content area. Shell stays still.                                                                                      |
| Sidebar and bottom tabs      | Active background pill slides between items (`layoutId`).                                                                                              |
| Dashboard load               | Total counts up once per session; summary rows and payment rows stagger in at 40 ms.                                                                   |
| Status filter tabs           | Sliding pill; rows cross-fade with layout animation as the filter changes.                                                                             |
| Create form                  | Step numbers turn into check marks with a small draw-on as each field validates. Validation errors expand in rather than pushing content abruptly.     |
| Link generated               | The form's last step expands into the Payment details panel; the QR code assembles; the link appears in `Recent requests` with a highlight that fades. |
| Copy link                    | Icon swaps to a check for 1.5 s, with a toast.                                                                                                         |
| Status change while watching | The badge cross-fades to the new status and the row pulses once. On payment details, the banner slides in when a request becomes Paid.                 |
| Cancel dialog                | Scale from 0.96 and fade; backdrop fades.                                                                                                              |
| Empty states                 | Illustration or icon fades in with a slight rise.                                                                                                      |
| Auth pages                   | The illustration draws on once (SVG stroke) if layered SVG is available; otherwise a fade and gentle float.                                            |

Skeletons shimmer while data loads; they are not in the designs and will follow the layout of each populated screen.

## Performance rules

- `will-change` is applied just before an animation and removed after, never left on.
- ScrollTriggers are created per section and killed on unmount; `ScrollTrigger.refresh()` runs after fonts and images settle.
- Looping animations pause when off-screen (IntersectionObserver) and when the tab is hidden.
- Pinning and scrubbing are disabled under 768 px and replaced with simple reveals, using `gsap.matchMedia()`.
- Landing photography is sized with `sizes` and never animated at more than its rendered resolution.
- Budget: no long task over 50 ms during scroll on a 4x CPU-throttled profile; the landing page holds 60 fps on a 2020 MacBook Air and 50+ on a mid-range Android.

## Reduced motion

With `prefers-reduced-motion: reduce`:

- Lenis is off; native scroll.
- Pinning, scrubbing, parallax, floating loops and SplitText reveals are off. Content is simply visible.
- State changes in checkout become 150 ms cross-fades. The success colour change is instant.
- Counters render their final value.
- Progress bars still move, since they convey status.

Handled once through `gsap.matchMedia()` and Motion's `MotionConfig reducedMotion="user"`.
