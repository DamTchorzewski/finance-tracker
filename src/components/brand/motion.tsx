import goalBurst from "@/assets/motion/goal-burst.svg";
import successCheck from "@/assets/motion/success-check.svg";

/*
 * The two motion files of the brand (docs/brand.md). Each plays once by itself and respects reduced motion; to play it
 * again, give the element a new `key`.
 */

/** The check that draws itself: the icon of a "saved" toast. */
export function SuccessCheck() {
  return <img src={successCheck} alt="" width={20} height={20} className="size-5" />;
}

/** Rays, coins and a ring over a goal card when it is reached; it ends empty, so it is an overlay. */
export function GoalBurst() {
  return (
    <img
      src={goalBurst}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 m-auto size-full max-h-72 object-contain"
    />
  );
}
