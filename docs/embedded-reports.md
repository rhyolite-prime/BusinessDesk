# Embedded ERP reports

## Chart of Accounts

Open **General Ledger → Reports → Chart of Accounts** at
`/ledger/reports/chart-of-accounts`. The built-in report follows the supplied
Chart of Accounts PDF: company/title header, grouped account numbers/names/
currencies, and a dated BusinessDesk footer with page X of Y. Control-path and
column headings repeat when a group continues onto another page.

Select an accounting unit, account type, status, and/or text search. Refresh
fetches a new data snapshot. The generated timestamp uses the unit time zone.
All statuses are included by default. No balances or demo records are included.
Accounts join controls and currencies by ID, never by overlapping ranges.
Null account currency uses the unit's base currency. Missing metadata is labeled
explicitly, rather than replaced by sample data. Company-profile 404 is allowed
with a warning; other failures stop generation and clear the previous snapshot.

The page uses existing authenticated, unit-scoped BFF APIs. Every accounts and
controls API page is fetched before generation. Failed/stale requests cannot
publish a partially loaded report. A safety limit of 500 API pages (100,000
records at 200/page) fails explicitly rather than silently truncating data.
Very large reports require client memory/CPU; server/background generation is
not implemented in this change.

## Viewer and exports

`ReportViewer.client.vue` accepts an immutable `EmbeddedReport` object. PDFMake
lays out the actual A4 PDF with wrapped text and non-splitting rows; PDF.js renders
one PDF page at a time. Thus page counts, navigation, and zoom use actual PDF
pagination, not an estimated number of records per screen. A fit-width mode,
page jump, first/last/previous/next controls, and screen-reader text are provided.
PDF worker and fonts are bundled locally, with no CDN or third-party report
service. Rendering/exports run only in the authenticated user's browser.

- **PDF:** exactly the generated preview document, all filtered records. Company,
  title, unit/filter context, and dated/page-number footer repeat on every page.
- **Excel (.xlsx):** real OOXML workbook with all data, group rows, frozen/repeated
  print headers, fitted print width, and print footers with page fields. Account
  numbers remain text, preserving leading zeros. Strings are not formulas.
- **Word (.docx):** real OOXML document with repeating company/title headers,
  group/column table headers, non-splitting rows, and PAGE/NUMPAGES footer fields.

Excel and Word paginate in their respective applications, so their page counts
may differ from PDF. Footer/print settings appear in their print/page-layout
views. Exports always include all filtered records, not just the current page.
Downloaded files are not stored on the server. Browser object URLs and PDF
rendering resources are released after use/unmount.

## Appearance and direct printing

The viewer's **Report appearance** control switches between Color and Black &
white. Switching regenerates the actual PDF, rather than applying a canvas/CSS
filter. The selected mode is applied consistently to preview, PDF, Excel, Word,
and printing. Black & white uses only grayscale text/shading; Excel also sets its
black-and-white print flag. The choice belongs to the viewer instance and is not
persisted as a cross-tenant browser preference.

**Print report** hands the full cached PDF to a same-origin blob iframe and opens
the browser's print dialog. It does not print the ERP chrome or just the current
canvas page, and does not regenerate or change record filters. Browser/PDF print
support and user permission are required; the user still chooses the printer,
page range, and printer settings. If the browser cannot print embedded PDFs,
export PDF and print from a PDF reader. Blob URLs/frames are cleaned after print,
on unmount/replacement, and by a fallback timeout for native handlers that do not
emit afterprint.

Headless tests verify full-PDF handoff and print API invocation with a mocked
print window, including failure and cleanup paths. They do not confirm an OS
print dialog or physical printer output. Run `node test/ledger/report_print_test.mjs`
for print handoff/resource checks; the exporter and browser tests also cover
appearance switching, grayscale PDF download, and both export style variants.

## Adding another standard report

Standard reports are code-defined and embedded, not external template files:

1. Define a pure data adapter returning `EmbeddedReport` (columns with percentage
   widths totaling 100, text-only rows and section headings).
2. Add the standard report to `embeddedReports`, its authenticated page, and the
   sidebar. Load data from existing authorized BFF APIs; do not accept client
   privilege, tenant scope, or untrusted executable templates.
3. Pass the resulting immutable snapshot to the shared viewer. The pagination,
   headers/footers, navigation, and three exporters are reused without a new
   viewer implementation.

Only Chart of Accounts is implemented here. Client-designed/custom reports and
report-designer/template import/integration remain outside this app's scope.

## Validation

After installing frontend dependencies:

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `node test/ledger/chart_of_accounts_report_test.mjs`
- `node test/ledger/report_export_files_test.mjs` (real 500-record wrapped PDF,
  XLSX and DOCX exports; artifacts written only to `/tmp/businessdesk-report-tests`)
- `PICKER_BROWSER_DEPS=/path/to/deps node test/ledger/reports_browser_test.mjs`
  requires playwright-core, @playwright/test and @sparticuz/chromium plus its
  platform libraries. Uses built Nuxt with a controlled upstream, not live Drogon.
  Covers 450 records over three API pages, actual PDF pages, navigation, zoom,
  all downloads, mobile fit, filters/races, empty results, upstream failure,
  missing company profile, and bearer-token forwarding.
