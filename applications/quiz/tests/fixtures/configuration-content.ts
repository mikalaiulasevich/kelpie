import { isString, isPlainObject } from 'es-toolkit';

export const ConfigurationContent = {
  collect(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.flatMap(ConfigurationContent.collect);
    }

    if (!isPlainObject(value)) {
      return [];
    }

    return Object.entries(value).flatMap(([key, content]) => {
      if (
        [
          'title',
          'body',
          'eyebrow',
          'helperText',
          'primaryActionLabel',
          'label',
          'summary',
          'unit',
        ].includes(key) &&
        isString(content)
      ) {
        return [content];
      }

      if (key === 'recommendations' && Array.isArray(content)) {
        return content.filter((item): item is string => isString(item));
      }

      return ConfigurationContent.collect(content);
    });
  },
};
