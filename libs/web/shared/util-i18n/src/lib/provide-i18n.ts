import { type EnvironmentProviders, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { I18n } from './i18n';

export function provideI18n(): EnvironmentProviders[] {
  return [
    ...provideTransloco({
      config: {
        availableLangs: ['he', 'en'],
        defaultLang: 'he',
        fallbackLang: 'he',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { useFallbackTranslation: true },
      },
    }),
    provideTranslocoMessageformat(),
    provideAppInitializer(() => {
      inject(I18n);
    }),
  ];
}
