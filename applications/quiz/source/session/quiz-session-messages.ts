export const QuizSessionMessages = {
  Network: 'We could not connect. Your answer is still here. Try again.',
  Invalid: 'The session response could not be read. Please try again.',
  Conflict:
    'This session changed in another tab. We refreshed your place; your draft is still saved.',
  Rejected: 'This answer could not be saved. Check the selection and try again.',
  Storage: 'Browser storage is unavailable. Drafts and analytics may not survive a refresh.',
  Delivery: 'Some viewing events are waiting to sync. Your confirmed answers are saved.',
  EventRejected: 'Some viewing events could not be accepted. Your confirmed answers are saved.',
} as const;
