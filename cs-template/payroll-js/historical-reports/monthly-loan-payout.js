
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        month: 1,
        year: new Date().getFullYear(),
        payload: {},
        loanTypeId: '',
        reportApiBaseUrl: '',
        loanTypeList: []
        
    },

    methods: {

        getReportData() {

            if (this.loanTypeId) {

                axios.get(`/PayrollReports/HrGetMonthlyLoanPayout?month=${this.month}&year=${this.year}&loanTypeId=${this.loanTypeId}`).then(response => {

                    response.data.reportHeader.forEach((v) => {

                        v.reportTitle = `${v.reportTitle}${response.data.reportDetails.currentDate}`;

                    });

                    this.renderReport(response.data.reportHeader, response.data.reportDetails.data);

                }).catch(err => {

                    this.toastHandler('error', 'Unable to get data');

                });
            }


        },


        renderReport(header, details) {

            $("#reportView").empty();

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1685634622/erp-reports/payroll/loan-payout_ozf6qz.rdl',
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

        getLoanTypes() {

            axios.get('/PayrollSetups/GetLoanTypes').then(response => {

                this.loanTypeList = response.data

            }).catch(err => {

                //console.log(err);
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

        this.getLoanTypes();

        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});