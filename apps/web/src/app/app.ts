import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Roles } from '@menu/web/shared/util-auth';
import { injectMessages } from '@menu/web/shared/util-i18n';
import { appMessages } from './app.messages';

/** Layout shell: the routed screen above a bottom navigation bar. */
@Component({
  selector: 'menu-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly t = injectMessages(appMessages);
  /** Owners and Admins get a third tab for their venues. */
  protected readonly roles = inject(Roles);
}
