import { Settings } from 'lucide-react';
import { useQuizLocale } from './quiz-locale-provider';
import { QuizLocalization } from './quiz-localization';

export function QuizSettings() {
  const { locale, changeLocale, translate, storageAvailable } = useQuizLocale();

  return (
    <details className="quiz-settings">
      <summary>
        <Settings aria-hidden="true" />
        <span>{translate('Settings')}</span>
      </summary>
      <div className="quiz-settings-panel">
        <label htmlFor="quiz-language">{translate('Language')}</label>
        <select
          id="quiz-language"
          value={locale}
          onChange={(event) => changeLocale(QuizLocalization.resolve(event.target.value))}
        >
          <option value="en" lang="en">
            English
          </option>
          <option value="ru" lang="ru">
            Русский
          </option>
        </select>
        <p>{translate('Language is saved in this browser. Your answers stay unchanged.')}</p>
        <p>
          {translate(
            'Custom configuration content is shown in its original language when a translation is unavailable.',
          )}
        </p>
        {!storageAvailable && (
          <p role="status">
            {translate('Language could not be saved. It will reset when this page is refreshed.')}
          </p>
        )}
      </div>
    </details>
  );
}
