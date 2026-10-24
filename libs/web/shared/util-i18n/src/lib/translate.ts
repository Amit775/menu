import { inject, PendingTasks } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type Translation, TranslocoService } from '@jsverse/transloco';
import { type Language } from '@menu/shared/contracts';
import { finalize, map, switchMap } from 'rxjs';

export interface I18nScope<T extends Translation> {
  readonly name: string;
  readonly loaders: Record<Language, () => Promise<T>>;
}

export type Translate<T extends Translation> = (
  key: Extract<keyof T, string>,
  params?: Record<string, unknown>,
) => string;

export function i18nScope<T extends Translation>(
  name: string,
  loaders: Record<Language, () => Promise<T>>,
): I18nScope<T> {
  return { name, loaders };
}

export function injectTranslate<T extends Translation>(scope: I18nScope<T>): Translate<T> {
  const transloco = inject(TranslocoService);
  const pendingTasks = inject(PendingTasks);
  const inlineLoader = {
    [`${scope.name}/he`]: scope.loaders.he,
    [`${scope.name}/en`]: scope.loaders.en,
  };
  const loaded = toSignal(
    transloco.langChanges$.pipe(
      switchMap((lang) => {
        const loading = pendingTasks.add();
        return transloco.load(`${scope.name}/${lang}`, { inlineLoader }).pipe(
          map(() => lang),
          finalize(loading),
        );
      }),
    ),
    { initialValue: null },
  );
  return (key, params) => {
    const lang = loaded();
    return lang === null ? '' : transloco.translate(key, params, `${scope.name}/${lang}`);
  };
}
