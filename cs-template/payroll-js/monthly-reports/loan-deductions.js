
var vue = new Vue({
    el: '#app',
    data: {

        emptyGuid: '00000000-0000-0000-0000-000000000000',
        isLoading: false,
        payload: {},
        reportType: 'summary-report',
        loanTypeId: '',
        reportApiBaseUrl: '',
        loanTypeList: [],
        reportPath: '',
        loanTypeName: '',
        reportPathConfig: {

            summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1732528729/erp-reports/payroll/loan-deduction-summary-report-with-sum_rv3fm0_xgsxyc.rdl',
            loanTypeReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1732529057/erp-reports/payroll/loan-deduction-by-type-updated_ausug7_bhofrr.rdl',
        },


    },

    methods: {

        getReportData() {

            let url = '/PayrollReports/GetLoanDeductions';

            this.reportPath = this.reportPathConfig.summaryReportPath;

            if (this.reportType === 'loan-type')
            {
                this.reportPath = this.reportPathConfig.loanTypeReportPath;

                url = `/PayrollReports/GetLoanDeductionsByType?loanTypeId=${this.loanTypeId}&loanTypeName=${this.loanTypeName}`;


            }

            axios.get(url).then(response => {

                response.data.reportHeader.forEach((v) => {

                    v.reportTitle = `${v.reportTitle} - ${response.data.reportDetails.currentDate}`;

                });


                this.renderReport(response.data.reportHeader, response.data.reportDetails.data, this.reportPath);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data');

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

    watch: {

        loanTypeId: function (val) {

            let loanTypeInfo = this.loanTypeList.find(x => x.id === val);

            if (loanTypeInfo) {

                this.loanTypeName = loanTypeInfo.name;

            }
        }

    },




    created() {

        this.getReportData();
        this.getLoanTypes();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});