export const QuizPreview = {
  active(): boolean {
    return (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('preview') === '1'
    );
  },

  storagePrefix(): string {
    return QuizPreview.active() ? 'kelpie.quiz.preview.' : 'kelpie.quiz.';
  },
};
