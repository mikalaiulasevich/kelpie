import { useLocalization } from '../localization/use-localization';
import { AdministrationAccess } from '../administration/administration-access';

export function Application(): UIElement {
  useLocalization();

  return <AdministrationAccess />;
}
