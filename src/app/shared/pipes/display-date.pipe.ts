import { Pipe, PipeTransform } from '@angular/core';
import { formatDisplayDate } from '../utils/date.utils';

/** {{ '2026-09-15' | displayDate }} -> 15 Sep 2026 (no timezone conversion) */
@Pipe({ name: 'displayDate' })
export class DisplayDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDisplayDate(value);
  }
}
