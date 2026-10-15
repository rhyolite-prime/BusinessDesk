
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetEmployeeRanks').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get employee ranks.');

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
                    { field: "name", headerText: "Employee Ranks", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveEmployeeRank(args.data);
                },
                endEdit: (args) => {

                    this.updateEmployeeRank(args.data);
                },
                endDelete: (args) => {

                    this.delEmployeeRank(args.data.id);
                },
            });

        },

        saveEmployeeRank(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/PayrollSetups/CreateEmployeeRank', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {

                    this.toastHandler('', 'Employee rank saved.');

                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee rank.');

            });
        },

        updateEmployeeRank(payload) {

            axios.post('/PayrollSetups/UpdateEmployeeRank', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Employee rank updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update employee rank.');

            });
        },

        delEmployeeRank(id) {

            axios.get('/PayrollSetups/DelEmployeeRank?id=' + id).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Employee rank cant be deleted.');

                    this.toastHandler('error', 'Employee rank has been referenced in other records.');
                }
                else
                {
                    this.toastHandler('', 'Employee rank deleted.');
                }
                
                this.getSetupData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee rank.');

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