import { ConfigurationInspectionContent } from './configuration-inspection-content';
export const ConfigurationInspectionFormat = {
  json(value: unknown): string {
    return JSON.stringify(value, null, 2) ?? ConfigurationInspectionContent.NotDeclared;
  },

  contentLabel(field: string): string {
    const words = field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

    return words.charAt(0).toUpperCase() + words.slice(1);
  },
} as const;
