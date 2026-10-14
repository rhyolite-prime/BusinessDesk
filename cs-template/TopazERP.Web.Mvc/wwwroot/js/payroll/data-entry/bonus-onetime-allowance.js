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
        allowanceTypeId: '',
        allowanceDays: null,
        allowanceTypeList: [],
        amount: null,
        percentage: null,
        isTaxable: false,
        isSSF: '1',
        employeeBonusList: []

    },
    validations() {

        return {

            year: {
                required
            },
            allowanceTypeId: {
                required
            },

        }


    },
    methods: {

        getEmployees() {

            axios.get(`/PayrollDataEntry/GetBonusEmployees?month=${this.month}&year=${this.year}`).then(response => {

                response.data.employees.forEach(v => {

                    v.employeeId = v.id;

                    v.employeeName = v.otherName === '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.employeeList = response.data.employees.sort((a, b) => a.lastName.localeCompare(b.lastName));

                this.allowanceTypeList = response.data.allowances;

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
                    { field: "lastName", headerText: "Last Name", width: 'auto', allowEditing: false },
                    { field: "firstName", headerText: "First Name", width: 'auto', allowEditing: false },
                    { field: "otherName", headerText: "Other Name", width: 'auto', allowEditing: false },
                ],

                childGrid: {
                    dataSource: responseData.bonusAndOnetimeAllowances,
                    queryString: "employeeId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    endAdd: (args) => {

                        this.saveBonus(args.data);
                    },
                    endDelete: (args) => {

                        this.delBonus(args.data.id);
                    },
                    endEdit: (args) => {

                        this.editBonus(args.data);
                    },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "tenantId", visible: false, headerText: "id", width: 'auto', },
                        { field: "allowanceTypeId", headerText: 'Earning Type', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 82, dataSource: responseData.allowances },
                        { field: "isFixedAmount", headerText: 'Fixed Amount ?', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                        { field: "amount", headerText: 'Amount', textAlign: ej.TextAlign.Left, width: 35, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, min: 0, max: 1000000 } },
                        { field: "percentage", headerText: 'Percentage', textAlign: ej.TextAlign.Left, width: 35, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, min: 0, max: 100 } },
                        { field: "isTaxable", headerText: 'Taxable ?', textAlign: ej.TextAlign.Center, width: 35, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                        { field: "isSSF", headerText: 'SSF ?', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                        { field: "isPF", headerText: 'PF ?', textAlign: ej.TextAlign.Center, width: 45, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                        { field: "allowanceDays", headerText: 'Allowance Days', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, min: 0, max: 100 } },
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

        getAllowanceTypes() {

            axios.get('/PayrollSetups/GetAllowanceTypes').then(response => {

                this.allowanceList = response.data.allowanceTypes;

            }).catch(err => {

                //console.log(err)
                //this.toastHandler('error', 'Unable to get allowance types.');

            });
        },

        saveBonus(payload) {

            payload.month = this.month;
            payload.year = this.year;

            delete payload.id;

            let allowanceTypeInfo = this.getAllowanceTypeDetails(payload.allowanceTypeId);

            payload.allowanceTypeName = allowanceTypeInfo.name;


            axios.post('/PayrollDataEntry/CreateBonusAndOnetimeAllowance', payload).then(response => {


                this.toastHandler('', 'Employee bonus saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee bonus.');

            });
        },

        delBonus(id) {

            axios.get(`/PayrollDataEntry/DelBonusAndOnetimeAllowance?id=${id}`).then(response => {

                this.toastHandler('', 'Employee bonus deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee bonus.');

            });
        },

        editBonus(payload) {

            payload.month = this.month;
            payload.year = this.year;

            let allowanceTypeInfo = this.getAllowanceTypeDetails(payload.allowanceTypeId);

            payload.allowanceTypeName = allowanceTypeInfo.name;
            
            axios.post('/PayrollDataEntry/UpdateBonusAndOnetimeAllowance', payload).then(response => {

                this.toastHandler('', 'Employee bonus updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee bonus.');

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

            this.isLoading = true;

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
                v.allowanceDays = this.allowanceDays == null ? 0 : this.allowanceDays;
                v.isPF = this.isSSF === '0' ? true : false;
                v.month = this.month;
                v.year = this.year;

            });

            payload.bonusList = this.employeeList;

            axios.post('/PayrollDataEntry/CreateBulkBonusAndOnetimeAllowance', payload).then(response => {

                this.toastHandler('', 'Employee bonus saved.');

                this.isLoading = false;


            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee bonus.');
                this.isLoading = false;

            });
        },     
       
        getAllowanceTypeDetails(id) {

            return this.allowanceTypeList.find(a => a.id === id);
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