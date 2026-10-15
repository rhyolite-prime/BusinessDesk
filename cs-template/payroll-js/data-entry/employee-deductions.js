 

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
        deductionTypes: [],
        deductionTypeId: '',
        name: '',
        employeeIdentifier: '',
    },
    
    methods: {

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {
                
                response.data.forEach(v => {

                    v.employeeName = v.otherName === '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.employeeList = response.data.sort((a, b) => a.lastName.localeCompare(b.lastName));
                
                this.employeeList.forEach((employee) => {
                    this.name = employee.otherName === '' || null ? `${employee.lastName} ${employee.firstName}` : `${employee.lastName} ${employee.firstName} ${employee.otherName}`
                    this.employeeIdentifier = employee.employeeIdentifier;
                });
                $("#employeeId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Employee",
                    width: "100%",
                    fields: { id: "id", text: "employeeName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.employeeId = args.value;
                        let employeeInfo = this.getEmployeeDetails(args.value);
                        this.categoryId = employeeInfo.categoryId;
                        this.getEmployeeDeductions();

                    }

                });


            }).catch(err => {

                //console.log(err);
            });
        },

        getEmployeeDeductions() {


            axios.get(`/PayrollDataEntry/GetEmployeeDeductions?employeeId=${this.employeeId}&categoryId=${this.categoryId}`).then(response => {

                response.data.deductionTypes.forEach((deductionType) => {

                    deductionType.deductionTypeId = deductionType.id;

                })

                this.deductionTypes = response.data.deductionTypes;

                this.renderTable(response.data);


            }).catch(err => {

                //console.log(err);
            });
           
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.employeeDeductions,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowSorting: true,
                editSettings: { allowAdding: true, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    {
                        field: "deductionTypeId", editTemplate: {

                            create: (args) => { return $('<input id="dataTableDeductionTypeId_hidden">'); },
                            read: (args) => { return args.ejDropDownList("getSelectedValue"); },
                            write: (args) =>
                            {
                                args.element.ejDropDownList({
                                    width: "100%", change: (args) =>
                                    {
                                        this.deductionTypeId = args.selectedValue;
                                        this.getDeductionRate(args.selectedValue);
                                    },
                                    dataSource: this.deductionTypes, fields: { id: "deductionTypeId", text: "name", value: "deductionTypeId" },
                                });
                            }
                        },

                        headerText: "Deduction Type", width: 45, editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "deductionTypeId", foreignKeyValue: "name", dataSource: this.deductionTypes, textAlign: ej.TextAlign.Left, width: 105
                    },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 55, },
                    { field: "employerAmount",  headerText: "Employer Amount", defaultValue: 0, format: "{0:n2}", width: 55, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {
                    this.saveEmployeeDeduction(args.data);
                },
                endEdit: (args) => {
                    this.editEmployeeDeduction(args.data);
                },
                endDelete: (args) => {
                    this.delEmployeeDeduction(args.data.id);
                },

            });

        },

        saveEmployeeDeduction(payload) {

            if (!payload.deductionTypeId) {

                this.toastHandler('warning', 'Deduction type required !');
                this.getEmployeeDeductions();

                return;
            }

            payload.employeeId = this.employeeId;
            payload.employeeIdentifier = this.employeeIdentifier;
            payload.employeeName = this.name;
         

            if (!payload.employerAmount) {
                payload.employerAmount = 0;
            }

            let deductionTypeInfo = this.getDeductionTypeDetails(payload.deductionTypeId);

            if (deductionTypeInfo) {

                payload.deductionTypeName = deductionTypeInfo.name;

            }
            axios.post('/PayrollDataEntry/CreateEmployeeDeduction', payload).then(response => {

                this.getEmployeeDeductions();

                this.toastHandler('', 'Employee deduction saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee deduction.');

            });
        },
        editEmployeeDeduction(payload) {

            if (!payload.deductionTypeId) {

                this.toastHandler('warning', 'Select a deduction type.');
                this.getEmployeeDeductions();

                return;
            }

            payload.employeeId = this.employeeId;
            payload.employeeIdentifier = this.employeeIdentifier;
            payload.employeeName = this.name;

            if (!payload.employerAmount) {
                payload.employerAmount = 0;
            }
            
            let deductionTypeInfo = this.getDeductionTypeDetails(payload.deductionTypeId);

            if (deductionTypeInfo) {

                payload.deductionTypeName = deductionTypeInfo.name;
            }

            axios.post('/PayrollDataEntry/UpdateEmployeeDeduction', payload).then(response => {

                this.getEmployeeDeductions();

                this.toastHandler('', 'Employee deduction updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee deduction.');

            });

        },
        delEmployeeDeduction(id) {

            axios.get('/PayrollDataEntry/DelEmployeeDeduction?id=' + id).then(response => {

                this.getEmployeeDeductions();

                this.toastHandler('', 'Employee deduction deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee deduction.');

            });

        },

        getDeductionRate(deductionTypeId) {

            axios.get(`/PayrollDataEntry/GetDeductionRate?deductionTypeId=${deductionTypeId}&employeeId=${this.employeeId}&categoryId=${this.categoryId}`).then(response => {

                console.log(response.data);

                if (response.data != null) {
                    $('[name="amount"]').val(response.data.amount);
                }
                else {
                    $('[name="amount"]').val(0);
                }

            }).catch(err => {

                //console.log(err);
            });
             

        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        getDeductionTypeDetails(id) {

            return this.deductionTypes.find(a => a.id === id);
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