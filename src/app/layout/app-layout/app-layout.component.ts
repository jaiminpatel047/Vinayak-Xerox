import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { HeaderComponent } from '../header/header.component';

/** Shell for every logged-in page: top header, page content, phone bottom bar. */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, HeaderComponent, BottomNavComponent],
  template: `
    <app-header />
    <main class="content">
      <router-outlet />
    </main>
    <app-bottom-nav />
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .content { padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px)); }
    @media (min-width: 900px) {
      .content { padding-bottom: 0; }
    }
  `,
})
export class AppLayoutComponent implements OnInit {
  private readonly profiles = inject(ProfileService);

  ngOnInit(): void {
    // Shop name for the header and dashboard. Failure here is not critical.
    if (!this.profiles.profile()) {
      this.profiles.getProfile().catch((error: unknown) => {
        console.error('Could not load profile', error);
      });
    }
  }
}
