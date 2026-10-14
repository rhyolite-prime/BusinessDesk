const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'Invoice',
            subReportType: 'supplier-report',
            reportApiBaseUrl: '',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            paymentList: [],
            supplierList: [],
            batchNumber: '',
            supplierId: '',
            reportPath: '',
            paymentId: '',
            reportPathConfig: {
                invoicePaymentReceiptReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1760621477/erp-reports/ap/paymentReceipts_ugn96o_sz1a4c_zci4hg.rdl',
                invoicePaymentSummaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758628496/erp-reports/ap/ap-payment-history-all_fwuftf.rdl',
                invoicePaymentSupplierReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758628545/erp-reports/ap/ap-payment-history_iq9bhl.rdl',
                invoicePaymentByDateReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758628496/erp-reports/ap/ap-payment-history-all_fwuftf.rdl',
            },
        }
    },
    methods: {
        getPayments() {
            axios.get('/ApDataEntry/GetPayments/')
                .then(response => {
                    this.paymentList = response.data.filter( payment => payment.isCanceled === false);
                    //format dates
                    this.paymentInvoiceList = [];
                    this.paymentInvoiceDetailsMap = {};
                    this.paymentList.forEach(payment => {
                        payment.paymentId = payment.id;
                        payment.displayText = payment.batchNumber + '-' + payment.supplierName;
                       
                    });
                    $("#paymentId").ejDropDownList({
                        dataSource: this.paymentList,
                        watermarkText: "Select Batch Number",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.paymentId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get payments.');
                });
        },

        getReportData() {
            this.isLoading = true;
            let url = '/ApReports/GetPayments';
            switch (this.reportType) {
                case 'Invoice':
                    switch (this.subReportType) {
                        case 'summary-report':
                            this.reportPath = this.reportPathConfig.invoicePaymentSummaryReportPath;
                            url = '/ApReports/GetPayments';
                            break;
                        case 'supplier-report':
                            this.reportPath = this.reportPathConfig.invoicePaymentSupplierReport;
                            url = `/ApReports/GetPaymentsBySupplier?SupplierId=${this.supplierId}`;
                            break;
                        case 'date-report':
                            this.reportPath = this.reportPathConfig.invoicePaymentByDateReportPath;
                            url = `/ApReports/GetPaymentsByDate?StartDate=${this.startDate}&EndDate=${this.endDate}`;
                            break;
                        case 'batchNumber':
                            this.reportPath = this.reportPathConfig.invoicePaymentReceiptReportPath;
                            url = `/ApReports/GetPaymentReceipts?id=${this.paymentId}`;
                            break;
                    }
                    break;
                    
            }

            axios.get(url)
                .then(response => {
                    const reportDetails = this.subReportType === 'batchNumber' ? response.data.reportDetails : response.data.reportDetails.data;
                    this.renderReport(response.data.reportHeader, reportDetails, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },



        renderReport(header, details, reportPath) {

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
                    $("#supplierId").ejDropDownList({
                        dataSource: this.supplierList,
                        watermarkText: "Select Supplier",
                        width: "100%",
                        fields: { id: "id", text: "name", value: "id" },
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
        this.getPayments();
       // this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');