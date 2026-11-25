import type { TDocumentDefinitions, TableCell as PdfCell, Content, Column } from 'pdfmake/interfaces'
import type { VoucherReport } from './voucher-report'

const widths = [12, 6, 12, 22, 16, 16, 16]

function customerReceiptPdfDefinition(report: VoucherReport): TDocumentDefinitions {
  const data = report.receiptData!
  const hasLogo = Boolean(report.companyLogoUrl && /^data:image\/(png|jpeg|jpg);base64,/i.test(report.companyLogoUrl))
  // A4 width less the left and right page margins, in points.
  const contentWidth = 523
  const ink = '#19343a', muted = '#5d7377', accent = '#226b65', rule = '#d6e2e0'
  const secondCopyMarker = 2, copyEndMarker = 3
  // Keep common amounts prominent, while leaving long currency values legible
  // within the fixed-width summary area.
  const amountFontSize = Math.max(9, Math.min(15, 255 / Math.max(1, data.amountPaid.length)))
  const label = (text: string) => ({ text, fontSize: 7, bold: true, color: muted, characterSpacing: 0.45 })
  // pdfmake otherwise expands columns to fit an unbroken reference/identifier,
  // which can push the amount and other receipt fields beyond the paper edge.
  // Non-breaking spaces are intentionally not treated as word boundaries.
  const wrapLongWords = (text: string, limit = 18) => text.split(/[ \t\r\n\-/]+/u).some(word => word.length >= limit) ? 'break-all' as const : 'normal' as const
  const line = (color: string, width = 0.6): Content => ({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: width, lineColor: color }],
  })

  function makeReceiptBlock(copyIndex: number): Content {
    const company: Content[] = [
      { text: report.companyName || 'BusinessDesk', bold: true, fontSize: 12, color: ink, wordBreak: wrapLongWords(report.companyName || 'BusinessDesk', hasLogo ? 22 : 27) },
    ]
    // An absent company profile must not turn into fabricated contact details.
    if (report.companyAddress) company.push({ text: report.companyAddress, fontSize: 8.5, color: muted, wordBreak: wrapLongWords(report.companyAddress, 24), margin: [0, 4, 0, 0] })
    if (report.companyPhone) company.push({ text: `Tel: ${report.companyPhone}`, fontSize: 8.5, color: muted, wordBreak: wrapLongWords(report.companyPhone, 24), margin: [0, 2, 0, 0] })

    const companyColumns: Column[] = []
    if (hasLogo) companyColumns.push({ image: report.companyLogoUrl!, fit: [48, 48], width: 48 })
    companyColumns.push({ width: '*', stack: company })

    const header: Content = {
      columns: [
        { width: '*', columns: companyColumns, columnGap: 12 },
        {
          width: 180,
          alignment: 'right',
          stack: [
            { text: 'OFFICIAL RECEIPT', fontSize: 15.5, bold: true, color: ink },
            { text: 'RECEIPT NO.', fontSize: 7, bold: true, color: muted, characterSpacing: 0.45, margin: [0, 8, 0, 2] },
            { text: data.receiptNo, fontSize: 10, bold: true, color: accent, wordBreak: wrapLongWords(data.receiptNo) },
          ],
        },
      ],
      columnGap: 16,
      margin: [0, 0, 0, 13],
    }

    const metadata = [
      { label: 'RECEIPT DATE', value: data.date },
      { label: 'BATCH NO.', value: data.batchNo },
      { label: 'R.V. / REFERENCE', value: data.rv },
      ...(data.regNo ? [{ label: 'REG. NO.', value: data.regNo }] : []),
    ]
    const metaColumns: Column[] = metadata.map(item => ({
      width: '*',
      stack: [label(item.label), { text: item.value, fontSize: 9, color: ink, wordBreak: wrapLongWords(item.value, metadata.length === 4 ? 13 : 18), margin: [0, 4, 0, 0] }],
    }))
    const meta: Content = { columns: metaColumns, columnGap: 12, margin: [0, 13, 0, 13] }

    const field = (name: string, value: string, prominent = false): Content => ({
      stack: [
        label(name),
        { text: value, fontSize: prominent ? 12 : 9.5, bold: prominent, color: ink, wordBreak: wrapLongWords(value, prominent ? 25 : 35), lineHeight: 1.15, margin: [0, 4, 0, 0] },
      ],
      margin: [0, 0, 0, 13],
    })
    const details: Content = {
      columns: [
        {
          width: '*',
          stack: [
            field('RECEIVED FROM', data.receivedFrom, true),
            field('THE SUM OF', data.theSumOf),
            field('PAYMENT FOR', data.being),
          ],
        },
        {
          width: 170,
          table: {
            widths: ['*'],
            body: [[{
              fillColor: '#edf5f3',
              stack: [
                label('AMOUNT PAID'),
                { text: data.amountPaid, fontSize: amountFontSize, bold: true, color: accent, wordBreak: wrapLongWords(data.amountPaid, 14), margin: [0, 5, 0, 0] },
                { ...label('CHEQUE NO. / PAYMENT'), margin: [0, 18, 0, 0] },
                { text: data.chequeNo, fontSize: 9.5, color: ink, wordBreak: wrapLongWords(data.chequeNo, 15), margin: [0, 4, 0, 0] },
              ],
            }]],
          },
          layout: {
            hLineWidth: () => 0, vLineWidth: () => 0,
            paddingLeft: () => 13, paddingRight: () => 13,
            paddingTop: () => 12, paddingBottom: () => 13,
          },
        },
      ],
      columnGap: 22,
      margin: [0, 16, 0, 0],
    }

    const signature: Content = {
      columns: [
        { width: '*', text: '' },
        {
          width: 150,
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.6, lineColor: '#9aaead' }] },
            { text: data.admin || 'Admin', alignment: 'center', fontSize: 9, color: ink, wordBreak: wrapLongWords(data.admin || 'Admin', 16), margin: [0, 5, 0, 0] },
            { text: 'PREPARED BY', alignment: 'center', fontSize: 6.5, bold: true, color: muted, characterSpacing: 0.4, margin: [0, 3, 0, 0] },
          ],
        },
      ],
      margin: [0, 35, 0, 17],
    }
    const copyFooter: Content = {
      columns: [
        { width: '*', text: `Report Printed On ${data.printedOn}` },
        { width: 'auto', text: 'BusinessDesk · G/L', alignment: 'center' },
        { width: 85, text: `COPY ${String(copyIndex).padStart(2, '0')}`, alignment: 'right', headlineLevel: copyEndMarker },
      ],
      fontSize: 7.5,
      color: muted,
      margin: [0, 6, 0, 0],
    }

    return {
      // A normal receipt copy should stay together when the second one does not
      // fit in the remaining space. Very long content may still flow naturally.
      headlineLevel: copyIndex === 2 ? secondCopyMarker : undefined,
      stack: [header, line(accent, 1.2), meta, line(rule), details, signature, line(rule), copyFooter],
    }
  }

  const cutLine: Content = {
    margin: [0, 22, 0, 22],
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 0.6, dash: { length: 3, space: 4 }, lineColor: '#a8bab8' }],
  }

  return {
    info: { title: 'OFFICIAL RECEIPT', author: report.companyName, creator: 'BusinessDesk' },
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [36, 26, 36, 30],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: ink },
    footer: (page, pages) => ({ text: `Page ${page} of ${pages}`, alignment: 'right', margin: [36, 7, 36, 0], fontSize: 7, color: muted }),
    // If the first copy ends on this page but the second one would be split,
    // start the latter on a fresh page. Avoid a blank page when a separator
    // has already flowed to a new sheet and oversized content must continue.
    pageBreakBefore: (node, following, _nextPage, previous) => node.headlineLevel === secondCopyMarker
      && previous.some(item => item.headlineLevel === copyEndMarker)
      && !following.some(item => item.headlineLevel === copyEndMarker),
    content: [makeReceiptBlock(1), cutLine, makeReceiptBlock(2)],
  }
}

export function voucherPdfDefinition(report: VoucherReport): TDocumentDefinitions {
  if (report.voucherType === 'customer-receipt' && report.receiptData) {
    return customerReceiptPdfDefinition(report)
  }
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
  const isReceipt = report.voucherType === 'customer-receipt' && !!report.receiptData
  const sheet = book.addWorksheet(isReceipt ? 'Official Receipt' : 'Voucher', {
    pageSetup: {
      paperSize: 9,
      orientation: isReceipt ? 'portrait' : 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: isReceipt ? '1:4' : '1:7',
    },
  })
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
  const isReceipt = report.voucherType === 'customer-receipt' && !!report.receiptData
  const paragraph = (text: string, bold = false, align?: 'left' | 'center' | 'right') => new Paragraph({ alignment: align, children: [new TextRun({ text, bold, size: 18 })] })
  const rows = report.voucherRows.map((row, index) => new TableRow({ cantSplit: true, tableHeader: index < 5, children: row.cells.map(item => new TableCell({ columnSpan: item.span || 1, shading: row.header ? { fill: 'EEEEEE' } : undefined, children: [paragraph(item.text, item.bold, item.align)] })) }))
  const doc = new Document({ creator: 'BusinessDesk', title: report.title, sections: [{ properties: { page: { size: isReceipt ? { width: 11906, height: 16838 } : { width: 16838, height: 11906 }, margin: { top: 650, bottom: 650, left: 650, right: 650 } } }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.companyName, bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [new TextRun({ text: report.subtitle, size: 18 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
  ] }] })
  return Packer.toBlob(doc)
}
