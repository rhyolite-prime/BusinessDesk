 

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
        reliefTypes: [],
        reliefTypeId: ''
    },
    
    methods: {

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName == '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

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
                        
                        this.getEmployeeReliefs();

                    }

                });


            }).catch(err => {

                //console.log(err);
            });
        },

        getEmployeeReliefs() {

            axios.get(`/PayrollDataEntry/GetEmployeeReliefs?employeeId=${this.employeeId}`).then(response => {

                response.data.taxReliefs.forEach((taxRelief) => {

                    taxRelief.reliefTypeId = taxRelief.id;
                })

                this.reliefTypes = response.data.taxReliefs;

                this.renderTable(response.data);


            }).catch(err => {

                //console.log(err);
            });
           
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.employeeReliefs,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowSorting: true,
                editSettings: { allowAdding: true, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search,] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    {
                        field: "reliefTypeId", editTemplate: {

                            create: (args) => { return $('<input id="dataTableReliefTypeId_hidden">'); },
                            read: (args) => { return args.ejDropDownList("getSelectedValue"); },
                            write: (args) =>
                            {
                                args.element.ejDropDownList({
                                    width: "100%", change: (args) =>
                                    {
                                        this.reliefTypeId = args.selectedValue;
                                        this.getReliefRate(args.selectedValue);
                                    },
                                    dataSource: this.reliefTypes, fields: { id: "reliefTypeId", text: "name", value: "reliefTypeId" },
                                });
                            }
                        },

                        headerText: "Relief Type", width: 45, editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "reliefTypeId", foreignKeyValue: "name", dataSource: this.reliefTypes, textAlign: ej.TextAlign.Left, width: 105
                    },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 55, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveEmployeeRelief(args.data);
                },
                endEdit: (args) => {

                    this.editEmployeeRelief(args.data);
                },
                endDelete: (args) => {

                    this.delEmployeeRelief(args.data.id);
                },

            });

        },

        saveEmployeeRelief(payload) {

            if (!payload.reliefTypeId) {

                this.toastHandler('warning', 'Select a relief type');

                this.getEmployeeReliefs();

                return;
            }

            payload.employeeId = this.employeeId;

            let employeeInfo = this.getEmployeeDetails(this.employeeId);

            payload.employeeIdentifier = employeeInfo.employeeIdentifier;

            let reliefTypeInfo = this.getReliefTypeDetails(payload.reliefTypeId);

            if (reliefTypeInfo) {

                payload.reliefTypeName = reliefTypeInfo.name;

            }

            axios.post('/PayrollDataEntry/CreateEmployeeRelief', payload).then(response => {

                this.getEmployeeReliefs();

                this.toastHandler('', 'Employee relief saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee relief.');

            });
        },
        editEmployeeRelief(payload) {

            if (!payload.allowanceTypeId) {

                this.toastHandler('warning', 'Select a relief type.');
                this.getEmployeeReliefs();

                return;
            }

            payload.employeeId = this.employeeId;

            let employeeInfo = this.getEmployeeDetails(this.employeeId);

            payload.employeeIdentifier = employeeInfo.employeeIdentifier;


            let reliefTypeInfo = this.getReliefTypeDetails(payload.reliefTypeId);

            if (reliefTypeInfo) {

                payload.reliefTypeName = reliefTypeInfo.name;

            }

            axios.post('/PayrollDataEntry/UpdateEmployeeRelief', payload).then(response => {

                this.getEmployeeReliefs();

                this.toastHandler('', 'Employee relief updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee relief.');

            });

        },
        delEmployeeRelief(id) {

            axios.get('/PayrollDataEntry/DelEmployeeRelief?id=' + id).then(response => {

                this.getEmployeeReliefs();

                this.toastHandler('', 'Employee relief deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee relief.');

            });

        },

        getReliefRate(reliefTypeId) {

            let reliefTypeInfo = this.getReliefTypeDetails(reliefTypeId);

            if (reliefTypeInfo) {

                $('[name="amount"]').val(reliefTypeInfo.amount);
            }

        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        getReliefTypeDetails(id) {

            return this.reliefTypes.find(a => a.id === id);
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