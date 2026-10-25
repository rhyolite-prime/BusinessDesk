import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { EmbeddedReport } from './report-types'

export function reportPdfDefinition(report: EmbeddedReport): TDocumentDefinitions {
  const content: Content[] = report.sections.map(section => ({
    margin: [0, 0, 0, 12],
    table: { widths: report.columns.map(column => `${column.width}%`), headerRows: 2, keepWithHeaderRows: 1, dontBreakRows: true,
      body: [
        [{ text: section.title, colSpan: report.columns.length, bold: true, fillColor: '#edf2f1', margin: [3, 4, 3, 4] }, ...report.columns.slice(1).map(() => ({}))],
        report.columns.map(column => ({ text: column.title, bold: true, decoration: 'underline', margin: [3, 3, 3, 3] })),
        ...section.rows.map(row => row.map(text => ({ text, margin: [3, 2, 3, 2] }))),
      ] as TableCell[][] }, layout: 'noBorders',
  }))
  return { info: { title: report.title, author: report.companyName, creator: 'BusinessDesk' }, pageSize: 'A4', pageMargins: [36, 145, 36, 48], defaultStyle: { font: 'Roboto', fontSize: 9, color: '#172321' },
    header: { margin: [36, 25, 36, 0], stack: [
      { text: report.companyName, alignment: 'center', bold: true, fontSize: report.companyName.length > 100 ? 9 : 13 },
      { canvas: [{ type: 'line', x1: 0, y1: 7, x2: 523, y2: 7, lineWidth: 1 }] },
      { text: report.title, alignment: 'center', bold: true, fontSize: 11, margin: [0, 12, 0, 3] },
      { text: report.subtitle, alignment: 'center', fontSize: 8, color: '#52625e' },
    ] },
    footer: (page, pages) => ({ margin: [36, 5, 36, 0], stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 0.7 }] },
      { margin: [0, 7, 0, 0], fontSize: 7, columns: [{ text: `Report printed on ${report.generatedAt}`, width: '*' }, { text: 'BusinessDesk · G/L', alignment: 'center', width: 120 }, { text: `Page ${page} of ${pages}`, alignment: 'right', width: 85 }] },
    ] }), content: content.length ? content : [{ text: 'No accounts match the selected filters.', margin: [0, 20, 0, 0] }], }
}

export async function createReportPdf(report: EmbeddedReport): Promise<Uint8Array> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  pdfMake.vfs = fonts as unknown as Record<string, string>
  return new Promise(resolve => pdfMake.createPdf(reportPdfDefinition(report)).getBuffer(buffer => resolve(new Uint8Array(buffer))))
}

export async function createReportExcel(report: EmbeddedReport): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook(); book.creator = 'BusinessDesk'
  const sheet = book.addWorksheet('Report', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:5' }, views: [{ state: 'frozen', ySplit: 5 }] })
  const count = report.columns.length
  for (const text of [report.companyName, report.title, report.subtitle, `Report printed on ${report.generatedAt}`]) { const row = sheet.addRow([text]); sheet.mergeCells(row.number, 1, row.number, count); row.font = { bold: row.number <= 2, size: row.number <= 2 ? 13 : 9 }; row.alignment = { wrapText: true }; row.height = row.number === 3 ? 32 : 22 }
  sheet.addRow(report.columns.map(column => column.title)).font = { bold: true }
  report.columns.forEach((column, index) => { sheet.getColumn(index + 1).width = column.width })
  for (const section of report.sections) {
    const row = sheet.addRow([section.title]); sheet.mergeCells(row.number, 1, row.number, count); row.font = { bold: true }; row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF2F1' } }
    for (const values of section.rows) { const detail = sheet.addRow(values); detail.alignment = { wrapText: true, vertical: 'top' }; detail.eachCell(cell => { cell.numFmt = '@' }) }
  }
  sheet.headerFooter = { oddHeader: `&C${report.companyName.replaceAll('&', '&&')}\n${report.title.replaceAll('&', '&&')}`, oddFooter: `&LReport printed on ${report.generatedAt.replaceAll('&', '&&')}&CBusinessDesk · G/L&RPage &P of &N` }
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(count).letter}${sheet.rowCount}`
  return new Blob([new Uint8Array(await book.xlsx.writeBuffer())], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function createReportWord(report: EmbeddedReport): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber, AlignmentType, Table, TableRow, TableCell, WidthType } = await import('docx')
  const paragraph = (text: string, bold = false) => new Paragraph({ children: [new TextRun({ text, bold, size: 19 })], spacing: { after: 60 }, keepNext: bold })
  const children = report.sections.map(section => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ tableHeader: true, cantSplit: true, children: [new TableCell({ columnSpan: report.columns.length, shading: { fill: 'EDF2F1' }, children: [paragraph(section.title, true)] })] }),
    new TableRow({ tableHeader: true, cantSplit: true, children: report.columns.map(column => new TableCell({ width: { size: column.width, type: WidthType.PERCENTAGE }, children: [paragraph(column.title, true)] })) }),
    ...section.rows.map(row => new TableRow({ cantSplit: true, children: row.map((text, index) => new TableCell({ width: { size: report.columns[index]!.width, type: WidthType.PERCENTAGE }, children: [paragraph(text)] })) })),
  ] }))
  const doc = new Document({ creator: 'BusinessDesk', title: report.title, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 2600, bottom: 1000, left: 720, right: 720, header: 400, footer: 400 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: report.companyName, bold: true, size: report.companyName.length > 100 ? 18 : 26 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: report.title, bold: true, size: 22 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: report.subtitle, size: 16 })], alignment: AlignmentType.CENTER })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: `Report printed on ${report.generatedAt}  |  BusinessDesk · G/L  |  Page `, size: 14 }), new TextRun({ children: [PageNumber.CURRENT], size: 14 }), new TextRun({ text: ' of ', size: 14 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14 })] })] }) },
    children: children.length ? children : [paragraph('No accounts match the selected filters.')],
  }] })
  return Packer.toBlob(doc)
}
