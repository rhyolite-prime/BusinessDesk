const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            invoiceId: '',
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            supplierGroupId: '',
            supplierGroupList: [],
            supplierGroupName: '',
            reportPath: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1737449564/erp-reports/ap/invoiceDetails_mmyqoy.rdl',
            },
        }
    },

    methods: {

        getReportData() {

            this.isLoading = true;

            let url = '/ApReports/GetInvoiceDetails?id='+ this.invoiceId;

            this.reportPath = this.reportPathConfig.summaryReportPath;


            axios.get(url).then(response => {


                this.renderReport(response.data.reportHeader, response.data.reportDetails.data, this.reportPath);


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
    
    createdmounted() {
        this.invoiceId = invoiceId;
        this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');