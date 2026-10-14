const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            invoiceList: [],
            invoiceId: '',
            voucherList: [],
            voucherId: '',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            supplierList: [],
            supplierId: '',
            reportPath: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755782780/erp-reports/ap/voucherSummary_fhmj9l.rdl',
                voucherBySupplierReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755782780/erp-reports/ap/VoucherBySupplier_acyuir.rdl',
                voucherByInvoiceReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755782780/erp-reports/ap/VoucherByInvoice_y1xfzj.rdl',
                voucherDetailsReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1763377532/erp-reports/ap/APPV_lslbln.rdl',
                voucherByDateReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755782780/erp-reports/ap/voucherSummary_fhmj9l.rdl',
            },
        };
    },
    methods: {

        getReportData() {
            this.isLoading = true;

            let url = '/ApReports/GetVouchers';
            this.reportPath = this.reportPathConfig.summaryReportPath;

            switch (this.reportType) {
                case 'bySupplier':
                    this.reportPath = this.reportPathConfig.voucherBySupplierReport;
                    url = `/ApReports/GetVouchersBySupplier?SupplierId=${this.supplierId}`;
                    break;
                case 'byInvoice':
                    this.reportPath = this.reportPathConfig.voucherByInvoiceReport;
                    url = `/ApReports/GetVouchersByInvoice?InvoiceId=${this.invoiceId}`;
                    break;
                case 'details':
                    this.reportPath = this.reportPathConfig.voucherDetailsReport;
                    url = `/ApReports/GetVoucherDetails?VoucherId=${this.voucherId}`;
                    break;
                case 'byDate':
                    this.reportPath = this.reportPathConfig.voucherByDateReport;
                    url = `/ApReports/GetVouchersByDate?StartDate=${this.startDate}&EndDate=${this.endDate}`;
                    break;
            }

            axios.get(url)
                .then(response => {
                    this.renderReport(response.data.reportHeader, response.data.reportDetails, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
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
        getSuppliers() {
            axios.get('/SharedResource/GetSuppliers')
                .then(response => {
                    this.supplierList = response.data;
                    if (this.supplierList.length > 0) {
                        this.supplierId = this.supplierList[0].id;
                    } else {
                        this.supplierId = null;
                    }
                    this.supplierList.forEach((supplier) => {
                       supplier.displayText = supplier.name + ' - ' + supplier.accountNumber;
                    });
                    $("#supplierId").ejDropDownList({
                        dataSource: this.supplierList,
                        watermarkText: "Select Supplier",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.supplierId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get suppliers.');
                });
        },

        getInvoices() {
            return axios.get('/ApDataEntry/GetInvoices')
                .then(response => {
                    this.invoiceList = response.data
                        .filter(a => a.isCanceled === false)
                        .sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));

                    this.invoiceList.forEach((invoice) => {
                        invoice.invoiceId = invoice.id;
                        invoice.displayText = `${invoice.supplierName} - ${invoice.invoiceNumber}`;

                    });

                    // Initialize the dropdown
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

                    return this.invoiceList;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get invoices.');
                    throw err;
                });
        },
        
        getVouchers() {
            axios.get('/ApDataEntry/GetVouchers')
                .then(response => {
                    this.voucherList = response.data;
                    if (this.voucherList.length > 0) {
                        this.voucherId = this.voucherList[0].id;
                    } else {
                        this.voucherId = null;
                    }
                    this.voucherList.forEach((voucher) => {
                        voucher.displayText = voucher.voucherNumber + ' - ' + voucher.supplierName;
                    });
                    $("#voucherId").ejDropDownList({
                        dataSource: this.voucherList,
                        watermarkText: "Select Voucher",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.voucherId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get vouchers.');
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
        this.getSuppliers();
        this.getInvoices();
        this.getVouchers();
        this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
});
app.mount('#app');