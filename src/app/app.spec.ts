import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { formatInr, subtractAmounts, sumAmounts } from './shared/utils/currency.utils';
import { formatDisplayDate, monthRange } from './shared/utils/date.utils';

describe('App', () => {
  it('should create the app', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('money and date helpers', () => {
  it('formats rupees the Indian way', () => {
    expect(formatInr(125000)).toBe('₹1,25,000');
  });

  it('adds and subtracts without floating point drift', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(subtractAmounts(60000, 14750.5)).toBe(45249.5);
  });

  it('never shifts business dates through UTC', () => {
    expect(formatDisplayDate('2026-09-15')).toBe('15 Sep 2026');
    expect(monthRange(2026, 2)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});
