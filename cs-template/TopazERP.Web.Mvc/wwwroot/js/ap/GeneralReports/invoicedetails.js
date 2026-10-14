const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            PrintedDate: moment().format("YYYY-MM-DD"),
            invoiceList: [],
            invoiceNumber: '',
            invoiceId: '',
            reportPath: '',
            reportHeader: [],
            reportDetails: [],
            supplierInfo: [],
            invoiceDetails: [],
            pdfUrl: '',
            referenceNumber: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1742396578/erp-reports/ap/invoiceDetails_mmyqoy_iryhog.rdl',
            },
            selectedInvoices: [],
            selectAll: false,
            showDropdown: false,
            modalActionType: "",
            modalInvoiceId: null,
            modalTitle: "",
            modalMessage: "",
            modalBulkIds: [],
            searchQuery: '',
            sortKey: '',
            sortAsc: true,
            perPage: 10,
            currentPage: 1,
            expanded: [],
            expandedYears: [],
            
        };
    },
    computed: {

        filteredInvoices() {
            let list = this.invoiceList.filter(i => i.id !== 'ALL');

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(i =>
                    (i.batchNumber && i.batchNumber.toLowerCase().includes(q)) ||
                    (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q)) ||
                    (i.supplierName && i.supplierName.toLowerCase().includes(q)) ||
                    (i.isPosted && i.isPosted.toString().toLowerCase().includes(q))
                );
            }

            if (this.sortKey) {
                list.sort((a, b) => {
                    let valA = a[this.sortKey] ?? '';
                    let valB = b[this.sortKey] ?? '';

                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();

                    if (valA < valB) return this.sortAsc ? -1 : 1;
                    if (valA > valB) return this.sortAsc ? 1 : -1;
                    return 0;
                });
            }

            return list;
        },
        isAllSelected() {
            return this.invoiceList.length > 0 &&
                this.selectedInvoices.length === this.invoiceList.filter(i => i.id !== 'ALL').length;
        },
        paginatedInvoices() {
            const start = (this.currentPage - 1) * this.perPage;
            return this.filteredInvoices.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.filteredInvoices.length / this.perPage) || 1;
        },
        selectedInvoice() {
            if (this.selectedInvoices.length === 1)
                return this.invoiceList.find(i => i.id === this.selectedInvoices[0]);
            return null;
        },
        paginationPages() {
            const total = this.totalPages;
            const current = this.currentPage;
            const delta = 2; // how many pages around current

            const range = [];
            const rangeWithDots = [];

            let l;

            for (let i = 1; i <= total; i++) {
                if (
                    i === 1 ||
                    i === total ||
                    (i >= current - delta && i <= current + delta)
                ) {
                    range.push(i);
                }
            }

            for (let i of range) {
                if (l) {
                    if (i - l === 2) {
                        rangeWithDots.push(l + 1);
                    } else if (i - l > 2) {
                        rangeWithDots.push('...');
                    }
                }
                rangeWithDots.push(i);
                l = i;
            }

            return rangeWithDots;
        },

    },
 
    methods: {
        toggleYear(year) {

            const index = this.expandedYears.indexOf(year);

            if (index > -1) {
                this.expandedYears.splice(index, 1);
            } else {
                this.expandedYears.push(year);
            }
        },
        toggleSelectAll() {
            if (this.selectAll) {
                // select all (exclude ALL option if present)
                this.selectedInvoices = this.invoiceList
                    .filter(i => i.id !== 'ALL')
                    .map(i => i.id);
            } else {
                this.selectedInvoices = [];
            }
        },
        
        sort(key) {
            if (this.sortKey === key) this.sortAsc = !this.sortAsc;
            else { this.sortKey = key; this.sortAsc = true; }
        },
        toggleInvoice(id) {
            const i = this.expanded.indexOf(id);
            if (i >= 0) this.expanded.splice(i, 1);
            else this.expanded.push(id);
        },
        getPdf() {
            // HANDLE ALL
            if (this.invoiceId === 'ALL') {
                this.printAllInvoices();
                return;
            }

            this.isLoading = true;

            let url = `/ApReports/GetInvoiceInPdf?id=${this.invoiceId}`;

            axios.get(url, { responseType: 'blob' })
                .then(response => {

                    if (!response.data) {
                        this.toastHandler("warning", "No Data is selected for printing.");
                        return;
                    }

                    const blob = new Blob([response.data], { type: "application/pdf" });
                    const blobUrl = URL.createObjectURL(blob);

                    // ✅ OPEN IN NEW TAB (Chrome-safe)
                    window.open(blobUrl, '_blank');

                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler("error", "Unable to load the invoice.");
                    this.isLoading = false;
                });
        },
        async printAllInvoices() {

            this.isLoading = true;

            const { PDFDocument } = PDFLib;

            const mergedPdf = await PDFDocument.create();

            // 👇 decide what to print
            let invoicesToPrint = [];

            if (this.selectedInvoices && this.selectedInvoices.length > 0) {
                // ✅ print only selected
                invoicesToPrint = this.invoiceList.filter(inv =>
                    this.selectedInvoices.includes(inv.id)
                );
            } else {
                // ✅ fallback to all (excluding ALL option)
                invoicesToPrint = this.invoiceList.filter(inv => inv.id !== 'ALL');
            }

            // 🚨 safety check
            if (invoicesToPrint.length === 0) {
                this.toastHandler('warning', 'No invoices to print.');
                this.isLoading = false;
                return;
            }

            // 👇 loop through chosen invoices
            for (let invoice of invoicesToPrint) {

                const response = await axios.get('/ApReports/GetInvoiceInPdf', {
                    params: { id: invoice.id },
                    responseType: 'arraybuffer'
                });

                const pdf = await PDFDocument.load(response.data);

                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(p => mergedPdf.addPage(p));
            }

            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // ✅ safer than iframe (avoids Chrome block issues)
            window.open(url, '_blank');

            this.isLoading = false;

            this.toastHandler(
                'success',
                this.selectedInvoices.length > 0
                    ? 'Selected invoices ready.'
                    : 'All invoices ready.'
            );
        },

        getReportData() {
             
            this.isLoading = true;

          //  let url = '/ApReports/GetInvoiceReport?id=' + this.invoiceId;
            let url = '/ApReports/GetInvoiceDetails?id=' + this.invoiceId;
            this.reportPath = this.reportPathConfig.summaryReportPath;
            axios.get(url).then(response => {
                  this.reportHeader = response.data.reportHeader[0];
                  this.reportDetails = response.data.reportDetails.data[0];
                  this.supplierInfo = response.data.reportDetails.supplierInfo[0];
                  this.invoiceDetails = response.data.reportDetails.invoiceDetails;
                  this.referenceNumber = response.data.reportDetails.invoiceDetails[0];
               
              //  this.renderReport(response.data.reportHeader, response.data.reportDetails.data, this.reportPath);


                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data');
                this.isLoading = false;

            });


        },
       

        renderReport(header, details, reportPath) {
            console.log(details);

            $("#reportView").empty();

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                toolbarSettings: {
                    showToolbar: true,
                    items: ej.ReportViewer.ToolbarItems.All &
                        ~ej.ReportViewer.ToolbarItems.Print
                },
                reportPath: reportPath,
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                    {
                        value: details,
                        name: "DataSet2"
                    }]

            });

        },

        getInvoices() {
            axios.get('/ApDataEntry/GetInvoices')
                .then(response => {

                    const invoices = response.data.filter(x => x.isCanceled === false);
                    
                    const allOption = {
                        id: 'ALL',
                        invoiceNumber: 'ALL',
                        supplierName: '',
                        displayText: 'All Invoices'
                    };

                    invoices.forEach(item => {
                        item.displayText = item.invoiceNumber + ' - ' + item.supplierName;
                    });
                    
                    this.invoiceList = [allOption, ...invoices];

                    this.invoiceId = 'ALL'; 

                    $("#invoiceId").ejDropDownList({
                        dataSource: this.invoiceList,
                        watermarkText: "Select Invoice Number",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.invoiceId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get invoices.');
                });
        },
        formatNumber(v) {
            const n = parseFloat(v ?? 0);
            return isNaN(n)
                ? '-'
                : n.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
        },
        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },


    },
    mounted() {
       // this.getReportData();
        this.getInvoices();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');