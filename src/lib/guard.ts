import { unstable_rethrow } from 'next/navigation'

// A server action that fails — most often "Failed to fetch" when the network
// drops mid-request — rejects inside its transition, and React sends that to
// the route's error.tsx, blanking the whole page. guard() wraps a transition
// callback so a failure is logged and announced (ActionErrorToast) instead;
// the rest of the callback is skipped, and useOptimistic state rolls back on
// its own when the transition ends. Next's own redirect / notFound signals
// are rethrown.
export const ACTION_ERROR_EVENT = 'action-error'

export function guard<A extends unknown[]>(fn: (...args: A) => unknown) {
  return async (...args: A) => {
    try {
      await fn(...args)
    } catch (e) {
      unstable_rethrow(e)
      console.error(e)
      window.dispatchEvent(new CustomEvent(ACTION_ERROR_EVENT))
    }
  }
}
