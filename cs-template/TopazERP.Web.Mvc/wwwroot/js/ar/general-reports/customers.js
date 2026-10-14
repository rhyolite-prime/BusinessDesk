const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            customerGroupId: '',
            customerGroupList: [],
            customerGroupName: '',
            reportPath: '',
            reportPathConfig: {

                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299058/erp-reports/ar/customers_eylpvf.rdl',
                customerGroupReport: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299058/erp-reports/ar/customers_eylpvf.rdl',
            },
        }

    },

    methods: {

        getReportData() {

            this.isLoading = true;

            let url = '/ArReports/GrGetCustomers';

            this.reportPath = this.reportPathConfig.summaryReportPath;

            if (this.reportType === 'customer-group') {

                this.reportPath = this.reportPathConfig.customerGroupReport;
                url = '/ArReports/GetCustomersByGroup?CustomerGroupId=' + this.customerGroupId + '&CustomerGroupName=' + this.customerGroupName;
            }




            axios.get(url).then(response => {



                this.renderReport(response.data.reportHeader, response.data.reportDetails, this.reportPath);


                this.isLoading = false;

            }).catch(err => {

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

        getCustomerGroups() {

            axios.get('/SharedResource/GetCustomerGroups').then(response => {

                this.customerGroupList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data');

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

    watch: {
        customerGroupId: function (val) {
            let customerGroupInfo = this.customerGroupList.find(x => x.id === val);

            if (customerGroupInfo) {

                this.customerGroupName = customerGroupInfo.name;

            }
        },
    },


    mounted() {

        this.getReportData();
        this.getCustomerGroups();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');