import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MessagesPipe } from '@menu/web/shared/util-i18n';
import { discoverUiMessages } from '../ui.messages';

/**
 * An item's score on a near-black chip ("4.6"), with the entry count beneath.
 * Below the floor the API sends no score, and the chip says so.
 */
@Component({
  selector: 'menu-score-badge',
  imports: [MessagesPipe],
  template: `
    @let t = messages | messages;
    @if (formatted(); as value) {
      <span class="score"
        ><span aria-hidden="true">{{ value }}</span
        ><span class="visually-hidden">{{ t.scoreLabel(value) }}</span></span
      >
    } @else {
      <span class="score none"
        ><span aria-hidden="true">–</span><span class="visually-hidden">{{ t.noScore }}</span></span
      >
    }
    @if (showCount()) {
      <span class="count">{{ t.entries(count()) }}</span>
    }
  `,
  styleUrl: './score-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.light]': 'tone() === "light"', '[class.large]': 'size() === "large"' },
})
export class ScoreBadge {
  readonly score = input.required<number | null>();
  readonly count = input(0);
  readonly showCount = input(true);
  readonly tone = input<'dark' | 'light'>('dark');
  readonly size = input<'small' | 'large'>('small');

  protected readonly messages = discoverUiMessages;
  protected readonly formatted = computed(() => {
    const score = this.score();
    return score === null ? null : score.toFixed(1);
  });
}
