import { QuizLocalizationMessages } from './quiz-localization-messages';
import { QuizLocales } from './quiz-localization-types';
import { ChevronDown, Settings } from 'lucide-react';
import { useQuizLocale } from './quiz-locale-provider';
import { QuizLocalization } from './quiz-localization';

export function QuizSettings() {
  const { locale, changeLocale, translate, storageAvailable } = useQuizLocale();

  return (
    <details className="quiz-settings">
      <summary>
        <Settings aria-hidden="true" />
        <span>{translate(QuizLocalizationMessages.Settings.Title)}</span>
        <ChevronDown className="quiz-settings-chevron" aria-hidden="true" />
      </summary>
      <div className="quiz-settings-panel">
        <label htmlFor="quiz-language">
          {translate(QuizLocalizationMessages.Settings.Language)}
        </label>
        <div className="quiz-settings-select">
          <select
            id="quiz-language"
            value={locale}
            onChange={(event) => changeLocale(QuizLocalization.resolve(event.target.value))}
          >
            <option value={QuizLocales.English} lang={QuizLocales.English}>
              English
            </option>
            <option value={QuizLocales.Russian} lang={QuizLocales.Russian}>
              Русский
            </option>
          </select>
          <ChevronDown aria-hidden="true" />
        </div>
        <p>{translate(QuizLocalizationMessages.Settings.Saved)}</p>
        <p>{translate(QuizLocalizationMessages.Settings.OriginalContent)}</p>
        {!storageAvailable && (
          <p role="status">{translate(QuizLocalizationMessages.Settings.Unavailable)}</p>
        )}
      </div>
    </details>
  );
}
