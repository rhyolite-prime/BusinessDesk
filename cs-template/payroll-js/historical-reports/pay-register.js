
var vue = new Vue({
    el: '#app',
    data: {

        emptyGuid: '00000000-0000-0000-0000-000000000000',
        isLoading: false,
        payload: {},
        month: 1,
        year: new Date().getFullYear(),
        reportType: 'summary-report',
        reportApiBaseUrl: '',
        allowanceTypeList: [],
        allowanceTypeId: '',
        categoryList: [],
        departmentList: [],
        departmentNameList: [],
        departmentHierachyList: [],
        reportPath: '',
        reportPathConfig: {

            summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1685634622/erp-reports/payroll/pay-register-summary_viigw2.rdl',
            categoryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1685634625/erp-reports/payroll/pay-register-by-category_gyhrad.rdl',
            departmentReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1685634625/erp-reports/payroll/pay-register-by-department_fh5vao.rdl',
        },
        
    },

    methods: {

        getReportData() {

            this.isLoading = true;

            let url = `/PayrollReports/HrGetPayRegister?month=${this.month}&year=${this.year}`;

            this.reportPath = this.reportPathConfig.summaryReportPath;

            switch (this.reportType) {

                case 'category':

                    this.reportPath = this.reportPathConfig.categoryReportPath;

                    break;

                case 'department':

                    this.reportPath = this.reportPathConfig.departmentReportPath;

                    break;



                default:
                    this.reportPath = this.reportPathConfig.summaryReportPath;
                    url = `/PayrollReports/HrGetPayRegister?month=${this.month}&year=${this.year}`;

            }

            

            axios.get(url).then(response => {

                response.data.reportHeader.forEach((v) => {

                    v.reportTitle = `${v.reportTitle}${response.data.reportDetails.currentDate}`;

                });

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
    
   
    created() {

        this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});