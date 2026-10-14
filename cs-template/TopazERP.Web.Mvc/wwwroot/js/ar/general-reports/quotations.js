const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            quotationId: '',
            quotationList: [],
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            customerList: [],
            customerId: '',
            reportPath: '',
            reportPathConfig: {

                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744378287/erp-reports/ar/quotations_cjxt6d.rdl',
                customerInvoiceReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744378287/erp-reports/ar/quotations_cjxt6d.rdl',
            },
        }
    },

    methods: {
        getReportData() {
            this.isLoading = true;

            let url = '/ArReports/GetQuotations';
            this.reportPath = this.reportPathConfig.summaryReportPath;

            switch (this.reportType) {
                case 'byCustomer':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetQuotationByCustomer?CustomerId=${this.customerId}`;
                    break;
                case 'byQuotationNumber':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetQuotation?quotationId=${this.quotationId}`;
                    break;
                case 'byDate':
                    this.reportPath = this.reportPathConfig.customerInvoiceReport;
                    url = `/ArReports/GetQuotationByDate?startDate=${this.startDate}&endDate=${this.endDate}`;
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
        getQuotations() {
            return axios.get('/ArDataEntry/GetQuotations').then(response =>
            {
                this.quotationList = response.data;
                this.quotationList.forEach((quotation) =>
                {
                    quotation.displayText = `${quotation.customerName} - ${quotation.quotationNumber}`;

                });
                $("#quotationId").ejDropDownList({
                    dataSource: this.quotationList,
                    watermarkText: "Select Quotation Number",
                    width: "100%",
                    fields: { id: "id", text: "displayText", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.quotationId = args.value;
                    }
                });
                return this.quotationList;
            })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get quotations.');
                    throw err;
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
        this.getQuotations();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');