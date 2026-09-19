import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LogoutService } from '../logout.service';
import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <header class="header">
      <div class="inner">
        <a routerLink="/dashboard" class="brand">
          <span class="logo" aria-hidden="true">₹</span>
          <span class="brand-text">
            <strong>Shop Ledger</strong>
            @if (shopName()) {
              <small>{{ shopName() }}</small>
            }
          </span>
        </a>

        <nav class="nav" aria-label="Main">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>

        <button type="button" class="logout" [disabled]="logoutService.busy()" (click)="logoutService.logout()">
          <app-icon name="logout" [size]="18" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  `,
  styles: `
    .header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding-top: env(safe-area-inset-top, 0px);
    }
    .inner {
      display: flex;
      align-items: center;
      gap: 20px;
      max-width: 1100px;
      height: var(--header-height);
      margin: 0 auto;
      padding: 0 16px;
    }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--text); text-decoration: none; min-width: 0; }
    .logo {
      display: grid; place-items: center; flex-shrink: 0;
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--primary); color: #fff; font-weight: 700; font-size: 1.2rem;
    }
    .brand-text { display: grid; line-height: 1.2; min-width: 0; }
    .brand-text strong { font-size: 1.1rem; }
    .brand-text small { color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nav { display: none; gap: 4px; margin-left: auto; }
    .nav a {
      padding: 8px 12px; border-radius: 8px;
      color: var(--text-muted); font-weight: 600; text-decoration: none;
    }
    .nav a:hover { color: var(--text); background: #f1f5f9; }
    .nav a.active { color: var(--primary); background: var(--primary-soft); }
    .logout {
      display: inline-flex; align-items: center; gap: 6px; margin-left: auto;
      min-height: 40px; padding: 6px 12px;
      border: 1px solid var(--border); border-radius: 8px;
      background: var(--surface); color: var(--text-muted); font-weight: 600; cursor: pointer;
    }
    .logout:hover { color: var(--expense); }
    @media (min-width: 900px) {
      .nav { display: flex; }
      .logout { margin-left: 0; }
    }
  `,
})
export class HeaderComponent {
  private readonly profiles = inject(ProfileService);
  protected readonly logoutService = inject(LogoutService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly shopName = computed(() => this.profiles.profile()?.shop_name?.trim() ?? '');
}
