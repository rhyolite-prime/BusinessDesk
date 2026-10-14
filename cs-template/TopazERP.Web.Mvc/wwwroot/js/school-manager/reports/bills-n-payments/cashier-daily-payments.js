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
            users: [],
            userId: '',
            reportHeader: null,
            reportDetails: [],
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1785408780/erp-reports/school-manager/cashier-daily_rogqg6.rdl',
            },
        }
    },
    methods: {
        getUsers() {
            return axios.get('/Users/GetAllUsers/').then(response => {
                this.users = response.data.result.data;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get users.');

            });
        },
        async filterReport() {
            await this.searchReport();
        },
        async searchReport() {
            this.isLoading = true;

            if (moment(this.startDate).isAfter(this.endDate)) {
                this.toastHandler('warning', 'Start date cannot be greater than end date.');
                this.isLoading = false;
                return;
            }

            let url = `/SmReports/GetCashierDailyPayments?startDate=${this.startDate}&endDate=${this.endDate}`;

            

            this.reportPath = this.reportPathConfig.summaryReportPath;

            axios.get(url)
                .then(response => {
                    const header = response.data.reportHeader;
                    const details = response.data.reportDetails;
                    this.reportDetails = details;
                    if (this.userId) {
                       this.reportDetails = details.filter(d => d.userId === this.userId);
                    }
                    this.renderReport(header, this.reportDetails, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('warning', 'No data found');
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
                dataSources: [
                    {
                        value: header,
                        name: "DataSet1"
                    },
                    {
                        value: details,
                        name: "DataSet2"
                    }
                ],
                reportError: (args) => {
                    console.error('Bold Report error:', args);
                    this.toastHandler('warning', 'No data available for the selected criteria.');
                }
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
        userId() {
            this.searchReport();
        }
    },
    async mounted() {
        await Promise.all([
            this.getUsers(),
        ]);

        this.reportApiBaseUrl = reportApiBaseUrl;
    }
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');