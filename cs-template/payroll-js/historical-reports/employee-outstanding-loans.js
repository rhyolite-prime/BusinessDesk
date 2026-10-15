
var vue = new Vue({
    el: '#app',
    data: {

        emptyGuid: '00000000-0000-0000-0000-000000000000',
        isLoading: false,
        month: 1,
        year: new Date().getFullYear(),
        payload: {},
        reportType: 'summary-report',
        loanTypeId: '',
        loanTypeName: '',
        employeeId: '',
        reportApiBaseUrl: '',
        reportPath: '',
        loanTypeList: [],
        reportPathConfig: {

            summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1732186196/erp-reports/payroll/employee-outstanding-loans-updated_vjj2r6.rdl',
            employeeReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1685634622/erp-reports/payroll/outstanding-loans-by-employee_dvvlk6.rdl',
        },
        
       
    },

    methods: {

        getReportData() {

            let url = `/PayrollReports/HrGetOutstandingLoans?month=${this.month}&year=${this.year}`;

            if (!this.loanTypeId)
            {
                this.loanTypeId = this.emptyGuid;
            }

            if (!this.employeeId) {

                this.employeeId = this.emptyGuid;
            }

            switch (this.reportType) {

                case 'loan-type':

                    this.reportPath = this.reportPathConfig.summaryReportPath;

                    url = `/PayrollReports/HrGetOutstandingLoansByLoanType?month=${this.month}&year=${this.year}&loanTypeId=${this.loanTypeId}&loanTypeName=${this.loanTypeName}`;

                    break;
                case 'employee':

                    this.reportPath = this.reportPathConfig.employeeReportPath;

                    url = `/PayrollReports/HrGetOutstandingLoansByLoanType?month=${this.month}&year=${this.year}&employeeId=${this.employeeId}&loanTypeId=${this.loanTypeId}`;

                    break;

                default:

                    this.reportPath = this.reportPathConfig.summaryReportPath;

                    url = `/PayrollReports/HrGetOutstandingLoans?month=${this.month}&year=${this.year}`;

            }

            axios.get(url).then(response => {

                response.data.reportHeader.forEach((v) => {

                    v.reportTitle = `${v.reportTitle}${response.data.reportDetails.currentDate}`;

                });

                this.reportPath = this.reportPathConfig.summaryReportPath;

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

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName == '' || null ? `${v.firstName} ${v.lastName} - ${v.employeeIdentifier}` : `${v.firstName} ${v.lastName} ${v.otherName} ${v.employeeIdentifier}`

                });

                this.employeeList = response.data;

                $("#employeeId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Employee",
                    width: "100%",
                    fields: { id: "id", text: "employeeName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.employeeId = args.value;
                    }

                });


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
        },
    },
    
    created() {

        this.getLoanTypes();
        this.getEmployees();
        this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});