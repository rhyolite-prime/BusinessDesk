import type { TDocumentDefinitions, TableCell as PdfCell } from 'pdfmake/interfaces'
import type { VoucherReport } from './voucher-report'

const widths = [12, 6, 12, 22, 16, 16, 16]
export function voucherPdfDefinition(report: VoucherReport): TDocumentDefinitions {
  const rows: PdfCell[][] = report.voucherRows.map(row => {
    const result: PdfCell[] = []
    for (const item of row.cells) {
      result.push({ text: item.text, colSpan: item.span || 1, bold: item.bold, alignment: item.align, margin: [3, 4, 3, 4], fillColor: row.header ? '#eeeeee' : undefined })
      for (let n = 1; n < (item.span || 1); n++) result.push({})
    }
    return result
  })
  return {
    info: { title: report.title, author: report.companyName, creator: 'BusinessDesk' },
    pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [30, 65, 30, 38],
    defaultStyle: { font: 'Roboto', fontSize: 8, color: '#171717' },
    header: { margin: [30, 16, 30, 0], stack: [{ text: report.companyName, bold: true, fontSize: 12, alignment: 'center' }, { text: report.subtitle, fontSize: 8, alignment: 'center', margin: [0, 4, 0, 0] }] },
    footer: (page, pages) => ({ text: `Page ${page} of ${pages}`, alignment: 'right', margin: [30, 10, 30, 0], fontSize: 8 }),
    content: [{ table: { headerRows: 5, widths: widths.map(w => `${w}%`), body: rows, dontBreakRows: true }, layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => '#555555', vLineColor: () => '#555555' } }],
  }
}
export async function createVoucherPdf(report: VoucherReport): Promise<Uint8Array> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  const vfs = { ...fonts } as unknown as Record<string, string>
  const reportFonts = { Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' }, ...pdfMake.fonts }
  return new Promise(resolve => pdfMake.createPdf(voucherPdfDefinition(report), undefined, reportFonts, vfs).getBuffer(buffer => resolve(new Uint8Array(buffer))))
}
export async function createVoucherExcel(report: VoucherReport): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook(); book.creator = 'BusinessDesk'
  const sheet = book.addWorksheet('Voucher', { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:7' } })
  sheet.columns = widths.map(width => ({ width: width * 1.15 }))
  for (const title of [report.companyName, report.subtitle]) {
    const row = sheet.addRow([title]); sheet.mergeCells(row.number, 1, row.number, 7)
    row.font = { bold: true, size: row.number === 1 ? 14 : 9 }; row.alignment = { horizontal: 'center', wrapText: true }; row.height = 24
  }
  for (const entry of report.voucherRows) {
    const row = sheet.addRow([]); let col = 1
    for (const item of entry.cells) {
      const span = item.span || 1
      if (span > 1) sheet.mergeCells(row.number, col, row.number, col + span - 1)
      const target = row.getCell(col); target.value = item.text; target.numFmt = '@'; target.font = { bold: !!item.bold, size: 10 }; target.alignment = { horizontal: item.align || 'left', vertical: 'middle', wrapText: true }
      if (entry.header) target.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }
      for (let i = col; i < col + span; i++) row.getCell(i).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
      col += span
    }
    const estimatedLines = entry.cells.reduce((max, item, index) => {
      const start = entry.cells.slice(0, index).reduce((sum, prior) => sum + (prior.span || 1), 0)
      const capacity = widths.slice(start, start + (item.span || 1)).reduce((a, b) => a + b, 0) * 1.05
      const lines = item.text.split('\n').reduce((total, part) => total + Math.max(1, Math.ceil(part.length / Math.max(capacity, 1))), 0)
      return Math.max(max, lines)
    }, 1)
    row.height = Math.min(409, Math.max(24, estimatedLines * 14 + 8))
  }
  sheet.pageSetup.printArea = `A1:G${sheet.rowCount}`
  return new Blob([new Uint8Array(await book.xlsx.writeBuffer())], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
export async function createVoucherWord(report: VoucherReport): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } = await import('docx')
  const paragraph = (text: string, bold = false, align?: 'left' | 'center' | 'right') => new Paragraph({ alignment: align, children: [new TextRun({ text, bold, size: 18 })] })
  const rows = report.voucherRows.map((row, index) => new TableRow({ cantSplit: true, tableHeader: index < 5, children: row.cells.map(item => new TableCell({ columnSpan: item.span || 1, shading: row.header ? { fill: 'EEEEEE' } : undefined, children: [paragraph(item.text, item.bold, item.align)] })) }))
  const doc = new Document({ creator: 'BusinessDesk', title: report.title, sections: [{ properties: { page: { size: { width: 16838, height: 11906 }, margin: { top: 650, bottom: 650, left: 650, right: 650 } } }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.companyName, bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [new TextRun({ text: report.subtitle, size: 18 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
  ] }] })
  return Packer.toBlob(doc)
}
