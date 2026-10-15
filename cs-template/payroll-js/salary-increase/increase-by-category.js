
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        isFixedAmount: '1',
        amount: null,
        percentage: null,
        salaryType: 'Salaried',
        employeeList: [],
        categoryList: [],
        categoryId: ''
    },

    methods: {


        getCategories() {

            axios.get('/PayrollSetups/GetEmployeeCategories').then(response => {

                this.categoryList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get employee categories.');

            });
        },

        getEmployeeBySalaryType() {

            if (this.categoryId)
            {

                axios.get(`/SalaryIncrease/GetEmployeeByCategory?salaryType=${this.salaryType}&categoryId=${this.categoryId}`).then(response => {

                    response.data.forEach((v) => {

                        v.incrementAmount = 0;

                    });

                    this.renderTable(response.data);


                }).catch(err => {


                });

            }
            
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 20, },
                    { field: "employeeIdentifier", headerText: "Employee ID", width: 45, },
                    { field: "employeeName", headerText: "Employee Name", width: 85, },
                    { field: "incrementAmount", headerText: "Increment Amount", format: "{0:n2}", width: 45, textAlign: ej.TextAlign.Right, },
                    { field: "monthlySalary", headerText: "Current Salary", format: "{0:n2}", width: 45, textAlign: ej.TextAlign.Right, },
                    { field: "previousSalary", headerText: "Previous Salary", format: "{0:n2}", width: 45, textAlign: ej.TextAlign.Right, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                 
            });

        },

        setIncrement() {

            this.getSelectedEmployees();


            if (this.isFixedAmount == '1') {

                if (this.employeeList.length != 0) {

                    this.employeeList.forEach( (v) => {
                        v.previousSalary = v.monthlySalary;
                        v.monthlySalary = parseFloat(v.monthlySalary) + parseFloat(this.amount);
                        v.incrementAmount = this.amount;

                    });

                    this.renderTable(this.employeeList);

                }
                else {

                   this.toastHandler('warning', 'Select an employee.');

                }


            }


            if (this.isFixedAmount == '0') {

                if (this.employeeList.length != 0) {

                    this.employeeList.forEach((v) => {
                        console.log(v.monthlySalary)

                        v.previousSalary = v.monthlySalary;
                        v.monthlySalary = (parseFloat(v.monthlySalary) * parseFloat(this.percentage) / 100) + parseFloat(v.monthlySalary);
                        v.incrementAmount = parseFloat(v.monthlySalary) * parseFloat(this.percentage) / 100;

                    });

                    this.renderTable(this.employeeList);

                }
                else {
                    this.toastHandler('warning', 'Select an employee.');
                }

            }
        },

        applyIncrement() {

            this.isLoading = true;

            let payload = {};

            payload.salaryData = this.employeeList;

            axios.post('/SalaryIncrease/ProcessSalaryIncrement', payload).then(response => {

                this.toastHandler('', 'Salary increment processed successfully.');
                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to process salary increment.');
                this.isLoading = false;

            });

        },

        getSelectedEmployees() {

            var obj = $("#dataTable").ejGrid("instance"), rec = []; this.employeeList = [];
            var check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
                for (var pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.employeeList = rec; 

        },

        getRecords(pageInx, inx, proxy, rec) {

            if (inx.length) {
                for (var i = 0; i < inx.length; i++) {
                    var pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    var data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

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

        salaryType(val) {

            this.getEmployeeBySalaryType();

        },
        categoryId(val) {

            this.getEmployeeBySalaryType();

        }

    },
    created() {

        this.getCategories();
        this.getEmployeeBySalaryType();
    },
});