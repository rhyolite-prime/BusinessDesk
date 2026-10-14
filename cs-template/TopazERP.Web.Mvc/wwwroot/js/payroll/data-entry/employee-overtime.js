Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        month: 1,
        year: new Date().getFullYear(),
        id: '',
        tenantId: '',
        overtimeTypeList: [],

    },
    validations() {

        return {

            year: {
                required
            },
            
        }


    },
    methods: {

        getEmployees() {

            axios.get(`/PayrollDataEntry/GetEmployeeOvertime?month=${this.month}&year=${this.year}`).then(response => {

                this.employeeList = response.data.employees;

                response.data.employees.forEach(v => {

                    v.employeeId = v.id;

                    v.employeeName = v.otherName == '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.overtimeTypeList = response.data.overtimeTypes;

                this.renderTable(response.data);

            }).catch(err => {

                //console.log(err);
            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.employees,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel,] },
                columns: [
                    { field: "employeeId", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    { field: "employeeIdentifier", headerText: "Employee ID", width: 'auto', allowEditing: false },
                    { field: "employeeName", headerText: "Employee Name", width: 'auto', allowEditing: false },
                ],

                childGrid: {
                    dataSource: responseData.overtimeTimeSheet,
                    queryString: "employeeId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    endAdd: (args) => {

                        this.saveOvertime(args.data);
                    },
                    endDelete: (args) => {

                        this.delOvertime(args.data.id);
                    },
                    endEdit: (args) => {

                        this.editOvertime(args.data);
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "overtimeTypeId", headerText: 'Overtime Type', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 75, dataSource: responseData.overtimeTypes },
                        { field: "overtimeHours", headerText: 'Hours', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, min: 0, max: 100 } },
                        { field: "overtimeMinutes", headerText: 'Minutes', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, min: 0, max: 60 } },
                        { field: "taxable", headerText: 'Taxable ?', displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 45, },
                        { field: "jobDescription", headerText: "Task Performed", width: 85, },
                        { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                    ],
                    actionComplete: (args) => {

                        
                    }

                },
            });

        },

        saveOvertime(payload) {

            payload.month = this.month;
            payload.year = this.year;

            delete payload.id;

            let employeeInfo = this.getEmployeeDetails(payload.employeeId);
             
            payload.employeeIdentifier = employeeInfo.employeeIdentifier;
            payload.employeeName = employeeInfo.employeeName;

            let overtimeTypeInfo = this.getOvertimeTypeDetails(payload.overtimeTypeId);

            payload.overtimeTypeName = overtimeTypeInfo.name;
 
            axios.post('/PayrollDataEntry/CreateEmployeeOvertime', payload).then(response => {

                this.toastHandler('', 'Employee overtime saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee overtime.');

            });
        },

        delOvertime(id) {

            axios.get(`/PayrollDataEntry/DelEmployeeOvertime?id=${id}`).then(response => {

                this.toastHandler('', 'Employee overtime deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee overtime.');

            });
        },

        editOvertime(payload) {

            payload.month = this.month;
            payload.year = this.year;

            let employeeInfo = this.getEmployeeDetails(payload.employeeId);

            payload.employeeIdentifier = employeeInfo.employeeIdentifier;
            payload.employeeName = employeeInfo.employeeName;

            let overtimeTypeInfo = this.getOvertimeTypeDetails(payload.overtimeTypeId);

            payload.overtimeTypeName = overtimeTypeInfo.name;
            
            axios.post('/PayrollDataEntry/UpdateEmployeeOvertime', payload).then(response => {

                this.toastHandler('', 'Employee overtime updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee overtime.');

            });
        },

        applyToAll() {


            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }


            if ((this.isFixedAmount === '1' && !this.amount) || (this.isFixedAmount === '1' && this.amount <= 0)) {

                this.toastHandler('warning', 'Amount must be greater than zero.');
                return;
            }

            if ((this.isFixedAmount === '0' && !this.percentage) || (this.isFixedAmount === '0' && this.percentage <= 0)) {

                this.toastHandler('warning', 'Percentage must be greater than zero.');
                return;

            }
            let payload = {};

            let allowanceTypeInfo = this.getAllowanceTypeDetails(this.allowanceTypeId);


            this.employeeList.forEach((v) => {

                delete v.id;
                
                v.allowanceTypeId = this.allowanceTypeId;
                v.allowanceTypeName = allowanceTypeInfo.name;
                v.isFixedAmount = this.isFixedAmount === '1' ? true : false;
                v.amount = this.isFixedAmount === '1' ? this.amount : 0;
                v.percentage = this.isFixedAmount === '0' ? this.percentage : 0;
                v.isTaxable = this.isTaxable;
                v.isSSF = this.isSSF === '1' ? true : false;
                v.allowanceDays = this.allowanceDays;
                v.isPF = this.isSSF === '0' ? true : false;
                v.month = this.month;
                v.year = this.year;

            });

            payload.bonusList = this.employeeList;

            axios.post('/PayrollDataEntry/CreateBulkBonusAndOnetimeAllowance', payload).then(response => {


                this.toastHandler('', 'Employee bonus saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee bonus.');

            });
        },     
       
        getOvertimeTypeDetails(id) {

            return this.overtimeTypeList.find(a => a.id === id);
        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
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

            this.getEmployees();

        },
        year(val) {

            this.getEmployees();

        },

    },
    created() {

        this.getEmployees();

    },
});