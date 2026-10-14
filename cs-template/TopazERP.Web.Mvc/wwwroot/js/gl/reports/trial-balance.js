var vue = new Vue({
    el: '#app',
    data: {

        emptyGuid: '00000000-0000-0000-0000-000000000000',
        isLoading: false,
        payload: {},
        reportType: 'summary-report',
        reportApiBaseUrl: '',
        accountActivity: '',
        accountList: [],
        costCenterList: [],
        costCenterNameList: [],
        costCenterHierachyList: [],
        startDate: '',
        endDate: '',
        reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1765277151/erp-reports/gl/daily-transactions_q0eiwr.rdl',
        reportPathConfig: { },
        
    },

    methods: {

        getReportData() {

            this.isLoading = true;

            let url = `/LedgerReports/GetDailyTransactions?startDate=${this.startDate}&endDate=${this.endDate}`;
            
            axios.get(url).then(response => {

                this.renderReport(response.data.reportHeader, response.data.reportDetails, this.reportPath);

                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get report data');
                this.isLoading = false;

            });

        },

        getExpenseAccounts() {

            axios.get('/LedgerSetups/GetLedgerAccounts?standardAccountType=5').then(response => {

                this.parseHierachy(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get cost centers.');

            });
        },

        

        renderReport(header, details, reportPath) {

            $("#reportView").empty();

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
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
    
   
    created() {

         this.getOus();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});