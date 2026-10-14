const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            reportApiBaseUrl: '',
            showMultiCurrency: false,
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1782228150/erp-reports/school-manager/GLTransactions_fuhrmv.rdl',
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
            
            this.reportPath = this.reportPathConfig.summaryReportPath;

            axios.get(`/SmReports/GetGlTransactions?startDate=${this.startDate}&endDate=${this.endDate}&isMultiCurrency=${this.showMultiCurrency}`)
                .then(response => {
                    this.renderReport(response.data.data, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },



        renderReport(details, reportPath) {
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
                    value: details,
                    name: "DataSet1"
                },
                ]


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
    watch: {
        showMultiCurrency: 'getReportData',
    },


    mounted() {
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');