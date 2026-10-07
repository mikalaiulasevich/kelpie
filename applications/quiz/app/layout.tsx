import { QuizLocaleProvider } from '../source/localization/quiz-locale-provider';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Your team, working better · Kelpie',
  description: 'Find a work model that fits your team. A thoughtful, guided workstyle assessment.',
};

export default function QuizLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QuizLocaleProvider>{children}</QuizLocaleProvider>
      </body>
    </html>
  );
}
