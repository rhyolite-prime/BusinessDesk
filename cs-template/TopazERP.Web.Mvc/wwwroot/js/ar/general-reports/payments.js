const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'Invoice',
            subReportType: 'customer-report',
            reportApiBaseUrl: '',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            paymentList: [],
            customerList: [],
            batchNumber: '',
            customerId: '',
            reportPath: '',
            paymentId: '',
            reportPathConfig: {
                invoicePaymentSummaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758628390/erp-reports/ar/ar-payment-history-all_upylwj.rdl',
                invoicePaymentCustomerReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758628390/erp-reports/ar/ar-payment-history_uwikt3.rdl',
                invoicePaymentByDateReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758628390/erp-reports/ar/ar-payment-history-all_upylwj.rdl',
            },
        }
    },

    methods: {
        getPayments() {
            axios.get('/ArDataEntry/GetInvoicePayments')
                .then(response => {
                    this.paymentList = response.data.filter( payment => payment.isCanceled === false);
                    //format dates
                    this.paymentInvoiceList = [];
                    this.paymentInvoiceDetailsMap = {};
                    this.paymentList.forEach(payment => {
                        payment.paymentId = payment.id;
                        payment.displayText = payment.batchNumber + '-' + payment.customerName;
                       
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
            let url = '/ArReports/GetPayments';
            switch (this.reportType) {
                case 'Invoice':
                    switch (this.subReportType) {
                        case 'summary-report':
                            this.reportPath = this.reportPathConfig.invoicePaymentSummaryReportPath;
                            url = '/ArReports/GetPayments';
                            break;
                        case 'customer-report':
                            this.reportPath = this.reportPathConfig.invoicePaymentCustomerReport;
                            url = `/ArReports/GetPaymentsByCustomers?CustomerId=${this.customerId}`;
                            break;
                        case 'date-report':
                            this.reportPath = this.reportPathConfig.invoicePaymentByDateReportPath;
                            url = `/ArReports/GetPaymentsByDate?StartDate=${this.startDate}&EndDate=${this.endDate}`;
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

        getCustomers() {
            axios.get('/SharedResource/GetCustomers')
                .then(response => {
                    this.customerList = response.data;
                    if (this.customerList.length > 0) {
                        this.customerId = this.customerList[0].id;
                    } else {
                        this.customerId = null;
                    }
                    $("#customerId").ejDropDownList({
                        dataSource: this.customerList,
                        watermarkText: "Select Customer",
                        width: "100%",
                        fields: { id: "id", text: "name", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.customerId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get customers.');
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
        this.getCustomers();
        this.getPayments();
       // this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');