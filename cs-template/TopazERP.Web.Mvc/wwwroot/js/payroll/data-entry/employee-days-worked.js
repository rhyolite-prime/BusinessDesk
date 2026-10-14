
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        month: 1,
        year: new Date().getFullYear(),
        salaryType: 'Salaried'

    },
    validations() {

        return {

            //employeeId: {
            //    required
            //},
            //monthlySalary: {
            //    required
            //},
            //accountNumber: {
            //    required,
            //},

        }


    },
    methods: {

        getEmployees() {

            if (this.month && this.year) {

                axios.get(`/PayrollDataEntry/InitializeEmployeesDaysWorked?month=${this.month}&year=${this.year}&salaryType=${this.salaryType}`).then(response => {

                    this.renderTable(response.data.sort((a, b) => a.lastName.localeCompare(b.lastName)));


                }).catch(err => {

                    //console.log(err);
                });

            }

        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    { field: "employeeId", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    { field: "employeeIdentifier", validationRules: { required: true, minlength: 1 }, headerText: "Employee ID", width: 55, allowEditing: false },
                    { field: "employeeName", validationRules: { required: true, minlength: 1 }, headerText: "Employee Name", width: 55, allowEditing: false },
                    { field: "days", format: "{0:n2}", editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, validationRules: { range: [0, 600] }, headerText: "Days", width: 40, },
                    { field: "hours", format: "{0:n2}", editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, validationRules: { range: [0, 600] }, headerText: "Hours", width: 40, },
                    { field: "minutes", format: "{0:n2}", editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, validationRules: { range: [0, 60] }, headerText: "Minutes", width: 40, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                
                endEdit: (args) => {

                    this.updateDaysWorked(args.data);
                },
                
            });

        },


        updateDaysWorked(payload) {

            delete payload.id;
            delete payload.lastName;
            delete payload.lastName;
            delete payload.otherName;

            payload.month = this.month;
            payload.year = this.year;

            axios.post('/PayrollDataEntry/CreateEmployeeDaysWorked', payload).then(response => {

                this.toastHandler('', 'Employee days worked info saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee days worked info.');

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

        month(val) {

            if (val) {

                this.getEmployees();
            }

        },

        year(val) {

            if (val) {

                this.getEmployees();
            }

        },

        salaryType(val) {

            if (val) {

                this.getEmployees();

            }

        }

    },
    created() {

        this.getEmployees();

    },
});