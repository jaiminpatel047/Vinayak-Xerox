import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { formatInr, subtractAmounts, sumAmounts } from './shared/utils/currency.utils';
import { formatDisplayDate, isFutureDate, monthRange, todayIso } from './shared/utils/date.utils';
import { TransactionFormComponent } from './shared/components/transaction-form/transaction-form.component';

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

  it('correctly detects future dates', () => {
    expect(isFutureDate('2099-12-31')).toBe(true);
    expect(isFutureDate('2020-01-01')).toBe(false);
    expect(isFutureDate(todayIso())).toBe(false);
    expect(isFutureDate(null)).toBe(false);
  });
});

describe('TransactionFormComponent date restriction', () => {
  it('disallows future dates in the form and sets max attribute', async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionFormComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TransactionFormComponent);
    fixture.componentRef.setInput('transactionType', 'income');
    fixture.detectChanges();

    const inputEl = fixture.nativeElement.querySelector('#t-date') as HTMLInputElement;
    expect(inputEl.getAttribute('max')).toBe(todayIso());

    const form = fixture.componentInstance['form'];
    // Default is today - valid
    expect(form.controls.transaction_date.valid).toBe(true);

    // Set future date
    form.controls.transaction_date.setValue('2099-01-01');
    expect(form.controls.transaction_date.valid).toBe(false);
    expect(form.controls.transaction_date.errors?.['futureDate']).toBe(true);

    // Set past date
    form.controls.transaction_date.setValue('2024-01-01');
    expect(form.controls.transaction_date.valid).toBe(true);
  });
});
