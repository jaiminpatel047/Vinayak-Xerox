import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { NAV_ITEMS } from '../nav-items';

/** Phone / small tablet navigation fixed to the bottom of the screen. */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav class="bottom-nav" aria-label="Main">
      @for (item of navItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active">
          <app-icon [name]="item.icon" [size]="22" />
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    .bottom-nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      height: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px));
      padding-bottom: env(safe-area-inset-bottom, 0px);
      background: var(--surface);
      border-top: 1px solid var(--border);
    }
    a {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
    }
    a.active { color: var(--primary); }
    @media (min-width: 900px) {
      .bottom-nav { display: none; }
    }
  `,
})
export class BottomNavComponent {
  protected readonly navItems = NAV_ITEMS.filter((item) => item.mobile);
}
