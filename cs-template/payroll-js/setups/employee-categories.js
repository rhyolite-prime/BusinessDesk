
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetEmployeeCategories').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get employee categories.');

            });
        },


        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "name", headerText: "Employee Category", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveEmployeeCategory(args.data);
                },
                endEdit: (args) => {

                    this.updateEmployeeCategory(args.data);
                },
                endDelete: (args) => {

                    this.delEmployeeCategory(args.data.id);
                },
            });

        },

        saveEmployeeCategory(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/PayrollSetups/CreateEmployeeCategory', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {

                    this.toastHandler('', 'Employee category saved.');
                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee category.');

            });
        },

        updateEmployeeCategory(payload) {

            axios.post('/PayrollSetups/UpdateEmployeeCategory', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Employee category updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee category.');

            });
        },

        delEmployeeCategory(id) {

            axios.get('/PayrollSetups/DelEmployeeCategory?id=' + id).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Employee category cant be deleted.');

                    this.toastHandler('error', 'Employee category has been referenced in other records.');
                }
                else
                {
                    this.toastHandler('', 'Employee category deleted.');
                }
                
                this.getSetupData();


            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee category.');

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

    created() {

        this.getSetupData();

    },
});