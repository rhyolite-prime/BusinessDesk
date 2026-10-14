Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        month: 1,
        year: new Date().getFullYear(),
        id: '',
        tenantId: '',
        isFixedAmount: '1',
        deductionTypeId: '',
        deductionTypeList: [],
        amount: null,
        employeeBonusList: [],
        percentage: null

    },
    validations() {

        return {

            year: {
                required
            },
            year: {
                required
            },
            deductionTypeId: {
                required
            },

        }


    },
    methods: {

        getEmployees() {

            axios.get(`/PayrollDataEntry/GetOnetimeDeductions?month=${this.month}&year=${this.year}`).then(response => {

                this.employeeList = response.data.employees;

                response.data.employees.forEach(v => {

                    v.employeeId = v.id;

                    v.employeeName = v.otherName == '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.deductionTypeList = response.data.deductionTypes;

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
                    dataSource: responseData.onetimeDeduction,
                    queryString: "employeeId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    endAdd: (args) => {

                        this.saveDeduction(args.data);
                    },
                    endDelete: (args) => {

                        this.delDeduction(args.data.id);
                    },
                    endEdit: (args) => {

                        this.editDeduction(args.data);
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "deductionTypeId", headerText: 'Deduction Name', validationRules: { required: true }, editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 85, dataSource: responseData.deductionTypes },
                        { field: "isFixedAmount", headerText: 'Fixed Amount ?', textAlign: ej.TextAlign.Center, width: 75, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                        { field: "percentage", headerText: 'Percentage', textAlign: ej.TextAlign.Left, width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, min: 0, max: 100 } },
                        { field: "amount", headerText: 'Amount', textAlign: ej.TextAlign.Left, width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, validationRules: { required: false, min: 0, max: 1000000 } },
                        { field: "tenantId", visible: false, headerText: "id", width: 'auto', },

                    ],
                    actionComplete: (args) => {

                        $("[name='isFixedAmount']").ejCheckBox({
                            change: (args) => {

                                if (args.isChecked) {

                                    $("[name='percentage']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: true, value: 0 });

                                }
                                else {
                                    $("[name='percentage']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: false, value: 0 });

                                }
                            },
                            create: (args) => {

                                if (args.model.checked) {
                                    $("[name='percentage']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: true, value: 0 });
                                }
                                else {
                                    $("[name='percentage']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: false, value: 0 });
                                }
                            },
                            beforeChange: (args) => {

                                if (args.model.checked) {
                                    $("[name='percentage']").ejNumericTextbox({ enabled: false, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: true, value: 0 });
                                }
                                else {
                                    $("[name='percentage']").ejNumericTextbox({ enabled: true, value: 0 });
                                    $("[name='amount']").ejNumericTextbox({ enabled: false, value: 0 });
                                }
                            },
                        })
                    }

                },
            });

        },

        saveDeduction(payload) {

            payload.month = this.month;
            payload.year = this.year;

            delete payload.id;


            let deductionTypeInfo = this.getDeductionTypeDetails(payload.deductionTypeId);

            payload.deductionTypeName = deductionTypeInfo.name;

            axios.post('/PayrollDataEntry/CreateOnetimeDeduction', payload).then(response => {

                this.toastHandler('', 'Employee deduction saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee deduction.');

            });
        },

        delDeduction(id) {

            axios.get(`/PayrollDataEntry/DelOnetimeDeduction?id=${id}`).then(response => {

                this.toastHandler('', 'Employee deduction deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee deduction.');

            });
        },

        editDeduction(payload) {

            payload.month = this.month;
            payload.year = this.year;


            let deductionTypeInfo = this.getDeductionTypeDetails(payload.deductionTypeId);

            payload.deductionTypeName = deductionTypeInfo.name;

            axios.post('/PayrollDataEntry/UpdateOnetimeDeduction', payload).then(response => {

                this.toastHandler('', 'Employee deduction updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee deduction.');

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

            this.isLoading = true;

            if ((this.isFixedAmount === '1' && !this.amount) || (this.isFixedAmount === '1' && this.amount <= 0)) {

                this.toastHandler('warning', 'Amount must be greater than zero.');
                return;
            }

            if ((this.isFixedAmount === '0' && !this.percentage) || (this.isFixedAmount === '0' && this.percentage <= 0)) {

                this.toastHandler('warning', 'Percentage must be greater than zero.');
                return;

            }

            let payload = {};

            let deductionTypeInfo = this.getDeductionTypeDetails(this.deductionTypeId);

            this.employeeList.forEach((v) => {

                delete v.id;
                
                v.deductionTypeId = this.deductionTypeId;
                v.deductionTypeName = deductionTypeInfo.name;
                v.isFixedAmount = this.isFixedAmount === '1' ? true : false;
                v.amount = this.isFixedAmount === '1' ? this.amount : 0;
                v.percentage = this.isFixedAmount === '0' ? this.percentage : 0 ;
                v.isTaxable = this.isTaxable;
                v.month = this.month;
                v.year = this.year;

            });

            payload.deductionList = this.employeeList;

            axios.post('/PayrollDataEntry/CreateBulkOnetimeDeduction', payload).then(response => {

                this.toastHandler('', 'Employee deduction saved.');
                this.getEmployees();
                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee deduction.');
                this.isLoading = false;

            });
        },     
       
        getDeductionTypeDetails(id) {

            return this.deductionTypeList.find(a => a.id === id);
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