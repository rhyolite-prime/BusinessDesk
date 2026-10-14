 

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
        bikTypes: [],
        benefitInKindTypeId: ''
    },
    
    methods: {

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName == '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.employeeList = response.data.sort((a, b) => a.lastName.localeCompare(b.lastName));;

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
                        this.getEmployeeBik();

                    }

                });


            }).catch(err => {

                //console.log(err);
            });
        },

        getEmployeeBik() {


            axios.get(`/PayrollDataEntry/GetEmployeeBik?employeeId=${this.employeeId}&categoryId=${this.categoryId}`).then(response => {

                response.data.bikTypes.forEach((bikType) => {

                    bikType.benefitInKindTypeId = bikType.id;

                })

                this.bikTypes = response.data.bikTypes;

                this.renderTable(response.data);


            }).catch(err => {

                //console.log(err);
            });
           
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.employeeBik,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowSorting: true,
                editSettings: { allowAdding: true, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    {
                        field: "benefitInKindTypeId", editTemplate: {

                            create: (args) => { return $('<input id="dataTableBenefitInKindTypeId_hidden">'); },
                            read: (args) => { return args.ejDropDownList("getSelectedValue"); },
                            write: (args) =>
                            {
                                args.element.ejDropDownList({
                                    width: "100%", change: (args) =>
                                    {
                                        this.benefitInKindTypeId = args.selectedValue;
                                        this.getBikRate(args.selectedValue);
                                    },
                                    dataSource: this.bikTypes, fields: { id: "benefitInKindTypeId", text: "name", value: "benefitInKindTypeId" },
                                });
                            }
                        },

                        headerText: "Benefit In Kind Type", width: 45, editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "benefitInKindTypeId", foreignKeyValue: "name", dataSource: this.bikTypes, textAlign: ej.TextAlign.Left, width: 105
                    },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 55, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {
                    this.saveEmployeeBik(args.data);
                },
                endEdit: (args) => {
                    this.editEmployeeBik(args.data);
                },
                endDelete: (args) => {
                    this.delEmployeeBik(args.data.id);
                },

            });

        },

        saveEmployeeBik(payload) {

            if (!payload.benefitInKindTypeId) {

                this.toastHandler('warning', 'Benefit in kind type required !');
                this.getEmployeeBik();

                return;
            }

            payload.employeeId = this.employeeId;
            payload.employeeIdentifier = this.employeeInfo.employeeIdentifier;

            let bikTypeInfo = this.getBikDetails(payload.benefitInKindTypeId);

            if (bikTypeInfo) {

                payload.benefitInKindTypeName = bikTypeInfo.name;

            }
            axios.post('/PayrollDataEntry/CreateEmployeeBik', payload).then(response => {

                this.getEmployeeBik();

                this.toastHandler('', 'Employee benefit in kind saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee benefit in kind.');

            });
        },

        editEmployeeBik(payload) {

            if (!payload.benefitInKindTypeId) {

                this.toastHandler('warning', 'Benefit in kind type required !');
                this.getEmployeeBik();

                return;
            }

            payload.employeeId = this.employeeId;
            payload.benefitInKindTypeId = payload.benefitInKindTypeId;
            payload.employeeIdentifier = this.employeeInfo.employeeIdentifier;

            let bikTypeInfo = this.getBikDetails(payload.allowanceTypeId);

            if (bikTypeInfo) {

                payload.benefitInKindTypeName = bikTypeInfo.name;

            }

            axios.post('/PayrollDataEntry/UpdateEmployeeBik', payload).then(response => {

                this.getEmployeeBik();

                this.toastHandler('', 'Employee benefit in kind updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee benefit in kind.');

            });

        },

        delEmployeeBik(id) {

            axios.get('/PayrollDataEntry/DelEmployeeBik?id=' + id).then(response => {

                this.getEmployeeBik();

                this.toastHandler('', 'Employee benefit in kind deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee benefit in kind.');

            });

        },

        getBikRate(benefitInKindTypeId) {

            axios.get(`/PayrollDataEntry/GetBikRate?bikTypeId=${benefitInKindTypeId}&employeeId=${this.employeeId}&categoryId=${this.categoryId}`).then(response => {

                $('[name="amount"]').val(response.data.amount);

            }).catch(err => {

                //console.log(err);
            });
             

        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        getBikDetails(id) {

            return this.bikTypes.find(a => a.id === id);
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