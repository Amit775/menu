import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { provideI18n } from './lib/provide-i18n';

setupTestBed({ providers: [provideI18n()] });
