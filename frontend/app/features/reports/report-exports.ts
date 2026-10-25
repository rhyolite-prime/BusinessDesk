import { reportHierarchyRows } from './report-hierarchy'
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { EmbeddedReport, ReportColorMode } from './report-types'

export function reportPalette(mode: ReportColorMode = 'color') {
  return mode === 'monochrome'
    ? { ink: '000000', accent: '000000', muted: '555555', fill: 'EEEEEE' }
    : { ink: '172321', accent: '176B53', muted: '52625E', fill: 'DCEFE8' }
}

export function reportPdfDefinition(report: EmbeddedReport, mode: ReportColorMode = 'color'): TDocumentDefinitions {
  const palette = reportPalette(mode)
  const hierarchy = reportHierarchyRows(report)
  const body: TableCell[][] = [report.columns.map(column => ({ text: column.title, bold: true, decoration: 'underline', margin: [3, 3, 3, 7] }))]
  for (const [rowIndex, row] of hierarchy.entries()) {
    if (row.kind === 'heading') body.push([
      { id: `report-heading-${rowIndex}`, text: row.label, colSpan: report.columns.length, bold: true, fontSize: row.depth === 0 ? 10.5 : 9.5,
        fillColor: row.shaded ? `#${palette.fill}` : undefined, color: `#${palette.accent}`, margin: [Math.min(row.depth, 6) * 12 + 3, 6, 3, 3] },
      ...report.columns.slice(1).map(() => ({})),
    ])
    else body.push(row.cells.map((text, index) => ({ id: index === 0 ? `report-account-${rowIndex}` : undefined, text, margin: [index === 0 ? Math.min(row.depth, 4) * 12 + 3 : 3, 2, 3, 2] })))
  }
  const content: Content[] = hierarchy.length ? [{ table: { widths: report.columns.map(column => `${column.width}%`), headerRows: 1, keepWithHeaderRows: 1, dontBreakRows: true, body }, layout: 'noBorders' }] : []
  return { info: { title: report.title, author: report.companyName, creator: 'BusinessDesk' }, pageSize: 'A4', pageMargins: [36, Math.max(110, 70 + Math.ceil(report.companyName.length / 65) * 16 + Math.ceil(report.subtitle.length / 95) * 10), 36, 48], pageBreakBefore: (node, following) => !!node.id?.startsWith('report-heading-') && !following.some(item => item.id?.startsWith('report-account-')), defaultStyle: { font: 'Roboto', fontSize: 9, color: `#${palette.ink}` },
    header: { margin: [36, 25, 36, 0], stack: [
      { text: report.companyName, alignment: 'center', bold: true, color: `#${palette.accent}`, fontSize: report.companyName.length > 100 ? 9 : 13 },
      { canvas: [{ type: 'line', x1: 0, y1: 7, x2: 523, y2: 7, lineWidth: 1 }] },
      { text: report.title, alignment: 'center', bold: true, fontSize: 11, color: `#${palette.accent}`, margin: [0, 12, 0, 3] },
      { text: report.subtitle, alignment: 'center', fontSize: 8, color: `#${palette.muted}` },
      { margin: [0, 8, 0, 0], canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 0.7, lineColor: `#${palette.accent}` }] },
    ] },
    footer: (page, pages) => ({ margin: [36, 5, 36, 0], stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 0.7 }] },
      { margin: [0, 7, 0, 0], fontSize: 7, columns: [{ text: `Report printed on ${report.generatedAt}`, width: '*' }, { text: 'BusinessDesk · G/L', alignment: 'center', width: 120 }, { text: `Page ${page} of ${pages}`, alignment: 'right', width: 85 }] },
    ] }), content: content.length ? content : [{ text: 'No accounts match the selected filters.', margin: [0, 20, 0, 0] }], }
}

export async function createReportPdf(report: EmbeddedReport, mode: ReportColorMode = 'color'): Promise<Uint8Array> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  pdfMake.vfs = fonts as unknown as Record<string, string>
  return new Promise(resolve => pdfMake.createPdf(reportPdfDefinition(report, mode)).getBuffer(buffer => resolve(new Uint8Array(buffer))))
}

export async function createReportExcel(report: EmbeddedReport, mode: ReportColorMode = 'color'): Promise<Blob> {
  const palette = reportPalette(mode)
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook(); book.creator = 'BusinessDesk'
  const sheet = book.addWorksheet('Report', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:5' }, views: [{ state: 'frozen', ySplit: 5 }] })
  sheet.pageSetup.blackAndWhite = mode === 'monochrome'
  const count = report.columns.length
  for (const text of [report.companyName, report.title, report.subtitle, `Report printed on ${report.generatedAt}`]) { const row = sheet.addRow([text]); sheet.mergeCells(row.number, 1, row.number, count); row.font = { bold: row.number <= 2, size: row.number <= 2 ? 13 : 9, color: { argb: `FF${row.number <= 2 ? palette.accent : palette.ink}` } }; row.alignment = { wrapText: true }; row.height = row.number === 3 ? 32 : 22 }
  sheet.getRow(4).eachCell(cell => { cell.border = { bottom: { style: 'thin', color: { argb: `FF${palette.accent}` } } } })
  sheet.addRow(report.columns.map(column => column.title)).font = { bold: true }
  report.columns.forEach((column, index) => { sheet.getColumn(index + 1).width = column.width })
  for (const item of reportHierarchyRows(report)) {
    if (item.kind === 'heading') {
      const row = sheet.addRow([item.label]); sheet.mergeCells(row.number, 1, row.number, count)
      row.font = { bold: true, color: { argb: `FF${palette.accent}` } }; row.alignment = { indent: Math.min(item.depth, 10), wrapText: true }
      if (item.shaded) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${palette.fill}` } }
    } else {
      const detail = sheet.addRow(item.cells); detail.font = { color: { argb: `FF${palette.ink}` } }; detail.alignment = { wrapText: true, vertical: 'top' }; detail.eachCell(cell => { cell.numFmt = '@' })
    }
  }
  sheet.headerFooter = { oddHeader: `&C${report.companyName.replaceAll('&', '&&')}\n${report.title.replaceAll('&', '&&')}`, oddFooter: `&LReport printed on ${report.generatedAt.replaceAll('&', '&&')}&CBusinessDesk · G/L&RPage &P of &N` }
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(count).letter}${sheet.rowCount}`
  return new Blob([new Uint8Array(await book.xlsx.writeBuffer())], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function createReportWord(report: EmbeddedReport, mode: ReportColorMode = 'color'): Promise<Blob> {
  const palette = reportPalette(mode)
  const { Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx')
  const paragraph = (text: string, bold = false) => new Paragraph({ children: [new TextRun({ text, bold, color: bold ? palette.accent : palette.ink, size: 19 })], spacing: { after: 60 }, keepNext: bold })
  const hierarchy = reportHierarchyRows(report)
  const children = hierarchy.length ? [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }, rows: [
    new TableRow({ tableHeader: true, cantSplit: true, children: report.columns.map(column => new TableCell({ width: { size: column.width, type: WidthType.PERCENTAGE }, children: [paragraph(column.title, true)] })) }),
    ...hierarchy.map(item => item.kind === 'heading'
      ? new TableRow({ cantSplit: true, children: [new TableCell({ columnSpan: report.columns.length, shading: item.shaded ? { fill: palette.fill } : undefined, children: [new Paragraph({ children: [new TextRun({ text: item.label, bold: true, color: palette.accent, size: item.depth === 0 ? 22 : 20 })], indent: { left: Math.min(item.depth, 6) * 240 }, spacing: { before: 120, after: 60 }, keepNext: true })] })] })
      : new TableRow({ cantSplit: true, children: item.cells.map((text, index) => new TableCell({ width: { size: report.columns[index]!.width, type: WidthType.PERCENTAGE }, children: [paragraph(text)] })) })),
  ] })] : []
  const doc = new Document({ creator: 'BusinessDesk', title: report.title, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 2600, bottom: 1000, left: 720, right: 720, header: 400, footer: 400 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: report.companyName, bold: true, color: palette.accent, size: report.companyName.length > 100 ? 18 : 26 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: report.title, bold: true, color: palette.accent, size: 22 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: report.subtitle, color: palette.muted, size: 16 })], alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: palette.accent, space: 8 } } })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: `Report printed on ${report.generatedAt}  |  BusinessDesk · G/L  |  Page `, size: 14 }), new TextRun({ children: [PageNumber.CURRENT], size: 14 }), new TextRun({ text: ' of ', size: 14 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14 })] })] }) },
    children: children.length ? children : [paragraph('No accounts match the selected filters.')],
  }] })
  return Packer.toBlob(doc)
}
