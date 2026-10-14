 

let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        isLoading: false,
        batchSize: 1,
        intervalCount: 1,
        intervalType: 'minute',
    },
    
    methods: {

        getPayrollResults() {

            axios.get('/ProcessPay/GetPayrollResults').then(response => {

                this.renderTable(response.data.payrollResults);

            }).catch(err => {


            });

        },

        dispatchPayslips(){

            this.isLoading = true;

            this.getSelectedEmployees();

            if (this.employeeList.length === 0) {
                this.toastHandler('warning', 'No employee selected.');
                this.isLoading = false;
                return;
            }
            
            let payload = {};

            payload.employeeIds = this.employeeList.map(v => v.employeeId);
            payload.intervalCount = this.intervalCount;
            payload.intervalType = this.intervalType;
            payload.batchSize = this.batchSize;

            axios.post('/ProcessPay/InitializePayslipDispatcher', payload).then(response => {

                this.toastHandler('', 'Payslips dispatched for delivery via mail.');
                this.isLoading = false;
              

            }).catch(err => {

                this.toastHandler('error', 'Unable to process payslips.');
                this.isLoading = false;

            });
            
        },


        getSelectedEmployees() {

            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.employeeList = [];
            let check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.employeeList = rec;

        },

        getRecords(pageInx, inx, proxy, rec) {

            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

            
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
                    { field: "employeeId", headerText: "employeeId", width: 75, visible: false,},
                    { type: "checkbox", width: 20, },
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

        this.getPayrollResults();
        

    },
});