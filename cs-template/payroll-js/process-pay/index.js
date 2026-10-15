
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        month: 1,
        year: new Date().getFullYear(),
        employeeStatusList: [],
        employeeList: [],
        processingText: 'Process Pay',
        
    },
    
    methods: {

        
        getEmployeeStatus() {

            axios.get('/PayrollSetups/GetEmployeeStatus').then(response => {

                this.employeeStatusList = response.data;

            }).catch(err => {


            });
        },
 
        processPay() {

            this.isLoading = true;
            this.processingText = 'Processing...';

            let defaultStatusInfo = this.getDefaultStatus();

            let statusId = defaultStatusInfo?.id;

            if (!defaultStatusInfo) {
                     
                    this.toastHandler('error', 'Default employee status found.');
                    this.isLoading = false;
                    this.processingText = 'Process Pay';
                    return;
            }  
            
            axios.get('/ProcessPay/InitPay?id=' + statusId).then(response => {

                if (response.data.code === 200) {

                    this.toastHandler('', 'Payroll processed successfully.');

                    this.isLoading = false;
                    this.processingText = 'Process Pay';

                    this.getPayrollResults();
                    this.switchToPayrollResultsTab();

                }
                else {

                    this.toastHandler('error', response.data.message);

                    this.isLoading = false;
                    this.processingText = 'Process Pay';
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to process payroll-js.');
                this.isLoading = false;
                this.processingText = 'Process Pay';

            });
        },

        switchToPayrollResultsTab() {
            $('#payroll-js-results-tab').tab('show');
        },
        
        getPayrollResults() {

            axios.get('/ProcessPay/GetPayrollResults').then(response => {


                response.data.employeesWithSalaries.forEach(v => {

                    v.employeeName = v.otherName === '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                let employeeList = response.data.employeesWithSalaries.sort((a, b) => a.lastName.localeCompare(b.lastName));
                
                this.renderEmployeesTable(employeeList);
                
                this.renderPayrollResultsTable(response.data.payrollResults);

            }).catch(err => {


            });

        },

        renderEmployeesTable(responseData) {

            $("#employeesDataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeIdentifier", headerText: "Employee ID", validationRules: { required: true, minlength: 1 }, width: 50, },
                    { field: "employeeName", headerText: "Employee Name", validationRules: { required: true, minlength: 1 }, width: 95, },
                    { field: "categoryName", headerText: "Category", validationRules: { date: true }, width: 55, },
                    { field: "departmentName", headerText: "Department", validationRules: { date: true }, width: 85, },

                ],
            });

        },

        renderPayrollResultsTable(responseData) {

            $("#payrollResultsDataTable").ejGrid({

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
                    { field: "taxableIncome", headerText: "Taxable Income", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "irsTax", headerText: "Income Tax", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "employeeSSFDeduction", headerText: "SSNIT Deduction", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "netSalary", headerText: "Net Salary", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 35 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                 
            });

        },

        getCurrentPayMonth() {

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


        getDefaultStatus() {

            return this.employeeStatusList.find(x => x.isDefault);
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


    },
    created() {

        this.getCurrentPayMonth();
        this.getEmployeeStatus();
        this.getPayrollResults();
    },
});