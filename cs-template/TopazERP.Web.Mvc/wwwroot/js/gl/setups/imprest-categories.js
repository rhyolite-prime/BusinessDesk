
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/LedgerSetups/GetImprestCategories').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve imprest categories.');

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
                    { field: "name", headerText: "Imprest Category", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveImprestCategory(args.data);
                },
                endEdit: (args) => {

                    this.updateImprestCategory(args.data);
                },
                endDelete: (args) => {

                    this.delImprestCategory(args.data.id);
                },
            });

        },

        saveImprestCategory(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/LedgerSetups/CreateImprestCategory', payload).then(response => {

                this.getSetupData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee status.');

            });
        },

        updateImprestCategory(payload) {

            axios.post('/LedgerSetups/UpdateImprestCategory', payload).then(response => {

                this.toastHandler('', 'Employee status updated.');

                this.getSetupData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to update student/staff status.');

            });
        },

        delImprestCategory(id) {

            axios.get('/LedgerSetups/DelImprestCategory?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Employee status deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee status.');

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