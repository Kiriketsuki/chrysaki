/**
 * Master switch for the decorative bar animation. The default is off.
 *
 * When false, each island and panel draws its gradient and border as a still frame.
 * No slash, ripple, border wave or tick timer runs. A real change still redraws.
 * When true, the island on the focused monitor animates and the others rest.
 * Timers that carry information (clock, toast progress, service blink) ignore this flag.
 */
export const ISLAND_ANIMATION = false
