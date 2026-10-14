
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        reportType: 'summary-report',
        startDate: moment().format("YYYY-MM-DD"),
        endDate: moment().format("YYYY-MM-DD"),
        reportApiBaseUrl: '',
        loanTypeList: [],
        employeeList: [],
        loanTypeId: '',
        employeeId: '',
        loanTypeName: '',
        reportPath: '',
        reportPathConfig: {
            summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1730116974/EmloyeeLoans-Summary_zvwuni.rdl',
            loanTypeReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1730117497/erp-reports/payroll/emloyee-loans-by-loantype_x1q4od.rdl',
            byEmployeeReportPath: "https://res.cloudinary.com/dusydqiob/raw/upload/v1730120444/erp-reports/payroll/employee-loans-by-employeeId_qcurkr.rdl"
        },
    },

    methods: {

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName == '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

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

        getReportData() {
            
            let url = '/PayrollReports/GetAllEmployeeLoans';

            this.reportPath = this.reportPathConfig.summaryReportPath;
            
            if (this.reportType === 'summary-report') {
                this.reportPath = this.reportPathConfig.summaryReportPath;

                url = `/PayrollReports/GetAllEmployeeLoans?startDate=${this.startDate}&endDate=${this.endDate}`;

            }

            if (this.reportType === 'loan-type')
            {
                this.reportPath = this.reportPathConfig.loanTypeReportPath;

                url = `/PayrollReports/GetEmployeeLoansByType?startDate=${this.startDate}&endDate=${this.endDate}&loanTypeId=${this.loanTypeId}&loanTypeName=${this.loanTypeName}`;
            }

            if (this.reportType === 'By-employee')
            {
                this.reportPath = this.reportPathConfig.byEmployeeReportPath;

                url = `/PayrollReports/GetEmployeeLoansByEmployee?employeeId=${this.employeeId}&startDate=${this.startDate}&endDate=${this.endDate}`;
            }

            axios.get(url).then(response => {

                response.data.reportHeader.forEach((v) => {

                    v.reportTitle = `${v.reportTitle} - ${response.data.reportDetails.currentDate}`;
                    console.log(response.data);

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
                console.log("Selected Loan Type Name:", this.loanTypeName);

            }
        }

    },
   
    created() {

        this.getReportData();
        this.getLoanTypes();
        this.getEmployees();

        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});