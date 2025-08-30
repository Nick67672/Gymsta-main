// Lightweight analytics helper to centralize event logging.
// Replace implementations with your preferred analytics SDK when ready.

export type AnalyticsEvent =
  | 'help_opened'
  | 'help_search_performed'
  | 'faq_viewed'
  | 'contact_form_opened'
  | 'ticket_submitted'
  | 'live_chat_started'
  // Workout Hub events
  | 'hub_viewed'
  | 'workout_started'
  | 'workout_finished'
  | 'template_created'
  | 'goal_created'
  | 'goal_completed'
  | 'pr_achieved';

export interface AnalyticsParams {
  [key: string]: string | number | boolean | undefined | null;
}

export function logEvent(event: AnalyticsEvent, params?: AnalyticsParams) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, params || {});
  } catch {
    // no-op
  }
}




