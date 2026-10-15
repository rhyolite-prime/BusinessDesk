 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeId: '',
        id: '',
        tenantId: '',
        employeeList: [],
        categoryId: '',
        employeeInfo: {},
        allowanceTypes: [],
        allowanceTypeId: ''
    },
    
    methods: {

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName === '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.employeeList = response.data.sort((a, b) => a.lastName.localeCompare(b.lastName));

                $("#employeeId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Employee",
                    width: "100%",
                    fields: { id: "id", text: "employeeName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.employeeId = args.value;
                        this.employeeInfo = this.getEmployeeDetails(args.value);
                        this.categoryId = this.employeeInfo.categoryId;
                        this.getEmployeeAllowances();

                    }

                });


            }).catch(err => {

                //console.log(err);
            });
        },

        getEmployeeAllowances() {

            axios.get(`/PayrollDataEntry/GetEmployeeAllowances?employeeId=${this.employeeId}&categoryId=${this.categoryId}`).then(response => {

                response.data.allowanceTypes.forEach((allowanceType) => {

                    allowanceType.allowanceTypeId = allowanceType.id;
                })

                this.allowanceTypes = response.data.allowanceTypes;

                this.renderTable(response.data);


            }).catch(err => {

                //console.log(err);
            });
           
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.employeeAllowances,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowSorting: true,
                editSettings: { allowAdding: true, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    {
                        field: "allowanceTypeId", editTemplate: {

                            create: (args) => { return $('<input id="dataTableAllowanceTypeId_hidden">'); },
                            read: (args) => { return args.ejDropDownList("getSelectedValue"); },
                            write: (args) =>
                            {
                                args.element.ejDropDownList({
                                    width: "100%", change: (args) =>
                                    {
                                        this.allowanceTypeId = args.selectedValue;
                                        this.getAllowanceRate(args.selectedValue);
                                    },
                                    dataSource: this.allowanceTypes, fields: { id: "allowanceTypeId", text: "name", value: "allowanceTypeId" },
                                });
                            }
                        },

                        headerText: "Allowance Type", width: 45, editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "allowanceTypeId", foreignKeyValue: "name", dataSource: this.allowanceTypes, textAlign: ej.TextAlign.Left,
                    },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 55, },
                    { field: "taxable", headerText: "Taxable ?", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 45, },
                    { field: "ssf", headerText: "SSF", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 45, },
                    { field: "providentFund", headerText: "Provident Fund", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 45, },
                    { field: "isMonthly", headerText: "Is Monthly/Daily?", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 45, },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 55, },
                    { field: "allowanceDays", headerText: "Allowance Days", format: "{0:n0}",  width: 55, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveEmployeeAllowance(args.data);
                },
                endEdit: (args) => {

                    this.editEmployeeAllowance(args.data);
                },
                endDelete: (args) => {

                    this.delEmployeeAllowance(args.data.id);
                },

            });

        },

        saveEmployeeAllowance(payload) {

            if (!payload.allowanceTypeId) {

                this.toastHandler('warning', 'Select an allowance type');
                this.getEmployeeAllowances();

                return;
            }

            if (payload.allowanceDays === null) {

                payload.allowanceDays = 0;
            }
 

            payload.employeeId = this.employeeId;
            payload.amount = parseFloat(payload.amount);
            payload.allowanceDays = parseFloat(payload.allowanceDays);
            payload.employeeIdentifier = this.employeeInfo.employeeIdentifier;

            payload.employeeName = !this.employeeInfo.otherName ? `${this.employeeInfo.lastName} ${this.employeeInfo.firstName}` : `${this.employeeInfo.lastName} ${this.employeeInfo.firstName} ${this.employeeInfo.otherName}`;

            let allowanceTypeInfo = this.getAllowanceTypeDetails(payload.allowanceTypeId);

            if (allowanceTypeInfo) {

                payload.allowanceTypeName = allowanceTypeInfo.name;

            }



            axios.post('/PayrollDataEntry/CreateEmployeeAllowance', payload).then(response => {

                this.getEmployeeAllowances();

                this.toastHandler('', 'Employee allowance saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee allowance.');

            });
        },
        editEmployeeAllowance(payload) {

            if (!payload.allowanceTypeId) {

                this.toastHandler('warning', 'Select an allowance type.');
                this.getEmployeeAllowances();

                return;
            }

            if (payload.allowanceDays === null) {

                payload.allowanceDays = 0;
            }
 

            payload.employeeId = this.employeeId;
            payload.amount = parseFloat(payload.amount);
            payload.allowanceDays = parseFloat(payload.allowanceDays);
            payload.employeeIdentifier = this.employeeInfo.employeeIdentifier;
            payload.employeeName = !this.employeeInfo.otherName ? `${this.employeeInfo.lastName} ${this.employeeInfo.firstName}` : `${this.employeeInfo.lastName} ${this.employeeInfo.firstName} ${this.employeeInfo.otherName}`;

            let allowanceTypeInfo = this.getAllowanceTypeDetails(payload.allowanceTypeId);

            if (allowanceTypeInfo) {

                payload.allowanceTypeName = allowanceTypeInfo.name;

            }

            axios.post('/PayrollDataEntry/UpdateEmployeeAllowance', payload).then(response => {

                this.getEmployeeAllowances();

                this.toastHandler('', 'Employee allowance updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee allowance.');

            });

        },
        delEmployeeAllowance(id) {

            axios.get('/PayrollDataEntry/DelEmployeeAllowance?id=' + id).then(response => {

                this.getEmployeeAllowances();

                this.toastHandler('', 'Employee allowance deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee allowance.');

            });

        },

        getAllowanceRate(allowanceTypeId) {

            axios.get(`/PayrollDataEntry/GetAllowanceRate?allowanceTypeId=${allowanceTypeId}&employeeId=${this.employeeId}&categoryId=${this.categoryId}`).then(response => {

                let data = response.data;

                if (data != null) {

                    $('[name="amount"]').val(data.amount);
                    $('[name="allowanceDays"]').val(data.allowanceDays);

                    $("[name='taxable']").ejCheckBox({ checked: data.taxable, }).data("ejCheckBox");
                    $("[name='isMonthly']").ejCheckBox({ checked: true, }).data("ejCheckBox");
                }
                else {

                    $('[name="amount"]').val(0);
                    $('[name="allowanceDays"]').val(0);

                    $("[name='taxable']").ejCheckBox({ checked: false, }).data("ejCheckBox");
                    $("[name='isMonthly']").ejCheckBox({ checked: false, }).data("ejCheckBox");
                }

            }).catch(err => {

                //console.log(err);
            });
             

        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        getAllowanceTypeDetails(id) {

            return this.allowanceTypes.find(a => a.id === id);
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

        this.getEmployees();

    },
});