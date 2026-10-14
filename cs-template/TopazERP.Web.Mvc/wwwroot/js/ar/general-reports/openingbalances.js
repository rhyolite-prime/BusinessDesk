const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'summary',
            reportStatus: "all",
            reportApiBaseUrl: '',
            balanceId: '',
            customerId: '',
            openingBalanceList: [],
            reportPath: '',
            reportPathConfig: {
                SummaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744301933/erp-reports/ar/openingBalancesByCustomer_fv64js.rdl',
                customerReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299832/erp-reports/ar/OpeningBalance_zzychr_a0rwll.rdl',
                type2Report: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744301932/erp-reports/ar/openingBalancesType2_ysq5em_gjeyq8.rdl',
            },
        }
    },

    methods: {
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
        getReportData() {
            this.isLoading = true;

            let url = `/ArReports/GetOpeningBalances?status=${this.reportStatus}`;
            this.reportPath = this.reportPathConfig.SummaryReportPath;

            switch (this.reportType) {
                case 'byCustomer':
                    this.reportPath = this.reportPathConfig.customerReport;
                    url = `/ArReports/GetOpeningBalancesByCustomer?CustomerId=${this.customerId}&status=${this.reportStatus}`;
                    break;
                case 'type2':
                    this.reportPath = this.reportPathConfig.type2Report;
                    url = `/ArReports/GetAllConvertedOpeningBalances?status=${this.reportStatus}`;
                    break;
            }
            axios.get(url)
                .then(response => {
                    this.renderReport(response.data.reportHeader, response.data.reportDetails, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('warning', 'Unable to get data');
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
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');