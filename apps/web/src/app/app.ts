import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Roles } from '@menu/web/shared/util-auth';
import { injectTranslate } from '@menu/web/shared/util-i18n';
import { appI18n } from './app.i18n';

@Component({
  selector: 'menu-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly t = injectTranslate(appI18n);
  protected readonly roles = inject(Roles);
}
