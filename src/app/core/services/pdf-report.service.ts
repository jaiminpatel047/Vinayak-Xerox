import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import type { RowInput, UserOptions } from 'jspdf-autotable';
import { CategoryTotal } from '../models/transaction.model';
import { MonthlyReport } from './report.service';
import { formatInr } from '../../shared/utils/currency.utils';
import { formatDisplayDate, formatShortDate, todayIso, toIsoDate } from '../../shared/utils/date.utils';
import { typeLabel } from '../models/transaction.model';

const FONT_NAME = 'NotoSans';
const FONT_FILES = {
  normal: 'fonts/NotoSans-Regular.ttf',
  bold: 'fonts/NotoSans-Bold.ttf',
} as const;

type FontStyle = keyof typeof FONT_FILES;
type AutoTable = (doc: jsPDF, options: UserOptions) => void;
type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

const MARGIN = 14;
const INCOME_COLOR: [number, number, number] = [21, 128, 61];
const EXPENSE_COLOR: [number, number, number] = [185, 28, 28];
const MUTED_COLOR: [number, number, number] = [100, 116, 139];

/**
 * Builds the monthly PDF entirely in the browser.
 * jsPDF is loaded only when a report is downloaded, keeping the app fast.
 */
@Injectable({ providedIn: 'root' })
export class PdfReportService {
  private fontCache: Partial<Record<FontStyle, string>> | null = null;

  async generateMonthlyReportPdf(report: MonthlyReport, shopName: string): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    // Built-in PDF fonts cannot draw '₹', so embed Noto Sans when possible.
    const fontName = await this.applyUnicodeFont(doc);
    const money = fontName === FONT_NAME ? formatInr : formatRs;

    const pageWidth = doc.internal.pageSize.getWidth();
    const baseStyles: UserOptions['styles'] = { font: fontName, fontSize: 10, cellPadding: 2 };

    // ---- Header ----
    doc.setFont(fontName, 'bold');
    doc.setFontSize(20);
    doc.text('SHOP LEDGER', pageWidth / 2, 20, { align: 'center' });
    doc.setFont(fontName, 'normal');
    doc.setFontSize(12);
    doc.text('Monthly Financial Report', pageWidth / 2, 27, { align: 'center' });
    this.rule(doc, 31);

    doc.setFontSize(11);
    doc.text(`Shop Name: ${shopName || '-'}`, MARGIN, 39);
    doc.text(`Month: ${report.label}`, MARGIN, 45);
    doc.setTextColor(...MUTED_COLOR);
    doc.setFontSize(9);
    doc.text(`Generated on ${formatDisplayDate(todayIso())}`, pageWidth - MARGIN, 45, {
      align: 'right',
    });
    doc.setTextColor(0, 0, 0);

    const table = autoTable as AutoTable;
    let y = 52;

    // ---- Summary ----
    y = this.sectionTitle(doc, fontName, 'SUMMARY', y);
    table(doc, {
      startY: y,
      theme: 'plain',
      styles: { ...baseStyles, fontSize: 11 },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 110,
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      body: this.summaryRows(report, money),
    });
    y = this.nextY(doc);

    // ---- Category breakdowns ----
    y = this.sectionTitle(doc, fontName, 'INCOME BREAKDOWN', y);
    table(doc, this.breakdownTable(report.incomeByCategory, y, baseStyles, money, INCOME_COLOR));
    y = this.nextY(doc);

    y = this.sectionTitle(doc, fontName, 'EXPENSE BREAKDOWN', y);
    table(doc, this.breakdownTable(report.expenseByCategory, y, baseStyles, money, EXPENSE_COLOR));
    y = this.nextY(doc);

    // ---- Transactions ----
    y = this.sectionTitle(doc, fontName, 'TRANSACTIONS', y);
    table(doc, {
      startY: y,
      theme: 'striped',
      styles: { ...baseStyles, fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' },
      margin: { left: MARGIN, right: MARGIN },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 20 },
        2: { cellWidth: 36 },
        4: { halign: 'right', cellWidth: 30 },
      },
      head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
      body: report.transactions.length
        ? report.transactions.map((t) => [
            formatShortDate(t.transaction_date),
            typeLabel(t.transaction_type),
            t.category,
            t.description ?? '',
            {
              content: money(t.amount),
              styles: {
                textColor: t.transaction_type === 'income' ? INCOME_COLOR : EXPENSE_COLOR,
              },
            },
          ])
        : [[{ content: 'No transactions found for this month.', colSpan: 5 }]],
    });
    y = this.nextY(doc);

    // ---- Final totals ----
    if (y + 30 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 20;
    }
    this.rule(doc, y - 2);
    table(doc, {
      startY: y,
      theme: 'plain',
      styles: { ...baseStyles, fontSize: 11 },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 110,
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      body: this.summaryRows(report, money),
    });
    this.rule(doc, this.nextY(doc) - 4);

    this.addPageNumbers(doc, fontName);
    doc.save(`shop-report-${toIsoDate(report.year, report.month, 1).slice(0, 7)}.pdf`);
  }

  private summaryRows(report: MonthlyReport, money: (n: number) => string): RowInput[] {
    const profitColor = report.totals.profit < 0 ? EXPENSE_COLOR : INCOME_COLOR;
    return [
      ['Total Income', { content: money(report.totals.income), styles: { textColor: INCOME_COLOR } }],
      ['Total Expense', { content: money(report.totals.expense), styles: { textColor: EXPENSE_COLOR } }],
      ['Net Profit', { content: money(report.totals.profit), styles: { textColor: profitColor } }],
    ];
  }

  private breakdownTable(
    rows: CategoryTotal[],
    startY: number,
    styles: UserOptions['styles'],
    money: (n: number) => string,
    headColor: [number, number, number],
  ): UserOptions {
    return {
      startY,
      theme: 'grid',
      styles,
      headStyles: { fillColor: headColor, fontStyle: 'bold' },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 110,
      columnStyles: { 1: { halign: 'right' } },
      head: [['Category', 'Amount']],
      body: rows.length
        ? rows.map((r) => [r.category, money(r.amount)])
        : [[{ content: 'No entries', colSpan: 2 }]],
    };
  }

  private sectionTitle(doc: jsPDF, fontName: string, title: string, y: number): number {
    if (y + 20 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(fontName, 'bold');
    doc.setFontSize(12);
    doc.text(title, MARGIN, y + 4);
    this.rule(doc, y + 6);
    doc.setFont(fontName, 'normal');
    return y + 9;
  }

  private rule(doc: jsPDF, y: number): void {
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN, y);
  }

  private nextY(doc: jsPDF): number {
    return ((doc as DocWithTable).lastAutoTable?.finalY ?? 20) + 10;
  }

  private addPageNumbers(doc: jsPDF, fontName: string): void {
    const pages = doc.getNumberOfPages();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(`Page ${i} of ${pages}`, width - MARGIN, height - 8, { align: 'right' });
      doc.text('Shop Ledger', MARGIN, height - 8);
    }
    doc.setTextColor(0, 0, 0);
  }

  /** Embeds Noto Sans (has the ₹ glyph). Falls back to Helvetica if the font can't load. */
  private async applyUnicodeFont(doc: jsPDF): Promise<string> {
    try {
      const fonts = await this.loadFonts();
      for (const style of Object.keys(FONT_FILES) as FontStyle[]) {
        const fileName = `${FONT_NAME}-${style}.ttf`;
        doc.addFileToVFS(fileName, fonts[style]);
        doc.addFont(fileName, FONT_NAME, style);
      }
      doc.setFont(FONT_NAME, 'normal');
      return FONT_NAME;
    } catch (error) {
      console.warn('Could not load PDF font, using Helvetica with "Rs."', error);
      return 'helvetica';
    }
  }

  private async loadFonts(): Promise<Record<FontStyle, string>> {
    if (!this.fontCache) {
      const entries = await Promise.all(
        (Object.entries(FONT_FILES) as [FontStyle, string][]).map(async ([style, url]) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
          return [style, toBase64(await response.arrayBuffer())] as const;
        }),
      );
      this.fontCache = Object.fromEntries(entries);
    }
    return this.fontCache as Record<FontStyle, string>;
  }
}

function formatRs(amount: number): string {
  return formatInr(amount).replace('₹', 'Rs. ');
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
