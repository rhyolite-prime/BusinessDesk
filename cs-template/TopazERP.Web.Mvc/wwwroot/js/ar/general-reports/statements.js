const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            reportType: 'type1',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            reportApiBaseUrl: '',
            customerList: [],
            customerId: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1760443956/erp-reports/ar/ar-statement-type-1_ykllj4_za9ccp.rdl',
                type1ReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758199967/erp-reports/ar/ar-statement-type-2_ioobvb.rdl',
                type2ReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1758192334/erp-reports/ar/ar-statement-type-3_iywf6x.rdl',
            },

        }

    },

    methods: {

        getReportData() {
            this.isLoading = true;

            //if start date is greater than end date, show error
            if (moment(this.startDate).isAfter(this.endDate)) {
                this.toastHandler('warning', 'Start date cannot be greater than end date.');
                this.isLoading = false;
                return;
            }
            
            if (!this.customerId) {
                this.toastHandler('warning', 'Please select a customer.');
                this.isLoading = false;
                return;
            }

            let url = `GetStatement?customerId=${this.customerId}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;

            switch (this.reportType) {
                case 'type1':
                    this.reportPath = this.reportPathConfig.summaryReportPath;
                    url = `GetStatement?customerId=${this.customerId}&startDate=${this.startDate}&endDate=${this.endDate}`;
                    break;
                case 'type2':
                    this.reportPath = this.reportPathConfig.type1ReportPath;
                    url = `GetStatementType2?customerId=${this.customerId}&startDate=${this.startDate}&endDate=${this.endDate}`;
                    break;
                case 'type3':
                    this.reportPath = this.reportPathConfig.type2ReportPath;
                    url = `GetStatementType3?customerId=${this.customerId}&startDate=${this.startDate}&endDate=${this.endDate}`;
                    break;
                default:
                    this.toastHandler('warning', 'Please select a valid report type.');
                    this.isLoading = false;
                    return;
            }

            axios.get(url)
                .then(response => {
                    this.renderReport(response.data.reportHeader, response.data.reportDetails.data, response.data.reportDetails.outstanding,  this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },



        renderReport(header, details, outstanding, reportPath) {

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
                    },
                    {
                        value: outstanding,
                        name: "DataSet3"
                    },
                ]

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



        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");
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
      //  this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');