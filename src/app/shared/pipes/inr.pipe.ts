import { Pipe, PipeTransform } from '@angular/core';
import { formatInr } from '../utils/currency.utils';

/** {{ 125000 | inr }} -> ₹1,25,000 */
@Pipe({ name: 'inr' })
export class InrPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatInr(value);
  }
}
