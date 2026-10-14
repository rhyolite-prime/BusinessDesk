let vue = new Vue({
        el: '#app',
        data: {
        isShimmerLoading: false,
        payload: {},
    },

    methods: {

        getSetupData() {

            axios.get('/SharedResource/GetSupplierGroups').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get supplier groups.');

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
                    { field: "name", headerText: "Supplier Group", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveSupplierGroup(args.data);
                },
                endEdit: (args) => {

                    this.updateSupplierGroup(args.data);
                },
                endDelete: (args) => {

                    this.delSupplierGroup(args.data.id);
                },
            });

        },

        saveSupplierGroup(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/SharedResource/CreateSupplierGroup', payload).then(response => {

                this.getSetupData();
                this.toastHandler('', 'Supplier group saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save supplier group.');

            });
        },

        updateSupplierGroup(payload) {

            axios.post('/SharedResource/UpdateSupplierGroup', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Supplier group updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update supplier group.');

            });
        },

        delSupplierGroup(id) {

            axios.get('/SharedResource/DelSupplierGroup?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Supplier group deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete supplier group.');

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
