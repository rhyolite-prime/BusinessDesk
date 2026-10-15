
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        month: 1,
        year: new Date().getFullYear(),
        processedMonth: '',
        processedYear: '',
        payrollResults: [],
    },
    
    methods: {
        getPayrollResults() {

            axios.get('/ProcessPay/GetPayrollResults').then(response => {
                this.payrollResults = response.data.payrollResults;
                this.processedMonth = response.data.payrollResults[0].month;
                this.processedYear = response.data.payrollResults[0].year;

            }).catch(err => {


            });

        },
        postPay() {

            this.isLoading = true;
            
           
            if (this.processedMonth !== this.month || this.processedYear !== this.year) {
                this.toastHandler('warning', 'No payroll-js results found for this month and year. Please process payroll-js first.');
                this.isLoading = false;
                return;
            }

            axios.get('/ProcessPay/InitPostPayroll').then(response => {

                if (response.data.code == 200) {

                    this.toastHandler('', response.data.message);
                }
                else {

                    this.toastHandler('warning', response.data.message);
                }


                this.isLoading = false;


            }).catch(err => {

                this.toastHandler('error', 'Unable to post payroll-js.');
                this.isLoading = false;


            });
        },

        initPayMonth() {

            axios.get('/PayrollSetups/GetPayMonth').then(response => {

                if (response.data) {

                    this.month = response.data.month;
                    this.year = response.data.year;
                }

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to pay month data.');

            });
        },

        

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeName", headerText: 'Employee Name', textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "employeeIdentifier", headerText: 'Employee ID', textAlign: ej.TextAlign.Left, width: 45 },
                    { field: "daysWorked", headerText: 'Days Worked', textAlign: ej.TextAlign.Left, width: 35 },
                    { field: "basicSalary", headerText: "Basic Salary", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "irsTax", headerText: "Income Tax", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "employeeSSFDeduction", headerText: "SSNIT Deduction", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "netSalary", headerText: "Net Salary", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                 
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
        this.getPayrollResults();
        this.initPayMonth();
    },
});