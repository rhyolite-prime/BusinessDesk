const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            invoiceId: '',
            invoiceList: [],
            batchNumber: '',
            invoiceNumber: '',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            startNumber: '1',
            endNumber: '10',
            customerList: [],
            customerId: '',
            reportPath: '',
            reportPathConfig: {

                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299834/erp-reports/ar/invoices_jczqlj_xpsoqv.rdl',
                customerInvoiceReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299834/erp-reports/ar/invoices_jczqlj_xpsoqv.rdl',
            },
        }
    },
    methods: {

        getReportData() {
            this.isLoading = true;

            let url = '/ArReports/GetAllInvoices';
            this.reportPath = this.reportPathConfig.summaryReportPath;

            switch (this.reportType) {
                case 'byCustomer':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetInvoice?CustomerId=${this.customerId}`;
                    break;
                case 'byBatch':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetInvoiceByBatch?batchNumber=${this.batchNumber}`;
                    break;
                case 'byInvoiceNumber':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetInvoiceByInvoiceNumber?invoiceNumber=${this.invoiceNumber}`;
                    break;
                case 'byDate':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetInvoiceByDate?startDate=${this.startDate}&endDate=${this.endDate}`;
                    break;
                case 'byInvoiceRange':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetInvoiceByInvoiceNumberRange?startNumber=${this.startNumber}&endNumber=${this.endNumber}`;
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

        getInvoices() {
            axios.get('/ArDataEntry/GetInvoices')
                .then(response => {
                    this.invoiceList = response.data.filter(x => x.isCanceled === false);
                    if (this.invoiceList.length > 0) {
                        this.invoiceId = this.invoiceList[0].id;
                        this.batchNumber = this.invoiceList[0].batchNumber;
                        this.invoiceNumber = this.invoiceList[0].invoiceNumber;
                    } else {
                        this.invoiceId = null;
                    }
                    $("#batchNumber").ejDropDownList({
                        dataSource: this.invoiceList,
                        watermarkText: "Select batch Number",
                        width: "100%",
                        fields: { id: "id", text: "batchNumber", value: "batchNumber" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.batchNumber = args.value;
                        }
                    });
                    $("#invoiceNumber").ejDropDownList({
                        dataSource: this.invoiceList,
                        watermarkText: "Select Invoice Number",
                        width: "100%",
                        fields: { id: "id", text: "invoiceNumber", value: "invoiceNumber" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.invoiceNumber = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get invoices.');
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

        this.getReportData();
        this.getCustomers();
        this.getInvoices();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');