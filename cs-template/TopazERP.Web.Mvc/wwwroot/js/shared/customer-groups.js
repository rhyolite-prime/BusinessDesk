
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/SharedResource/GetCustomerGroups').then(response => {

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
                    { field: "name", headerText: "Customer Group", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveCustomerGroup(args.data);
                },
                endEdit: (args) => {

                    this.updateCustomerGroup(args.data);
                },
                endDelete: (args) => {

                    this.delCustomerGroup(args.data.id);
                },
            });

        },

        saveCustomerGroup(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/SharedResource/CreateCustomerGroup', payload).then(response => {

                this.getSetupData();
                this.toastHandler('', 'Customer group saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save customer group.');

            });
        },

        updateCustomerGroup(payload) {

            axios.post('/SharedResource/UpdateCustomerGroup', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Customer group updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update customer group.');

            });
        },

        delCustomerGroup(id) {

            axios.get('/SharedResource/DelCustomerGroup?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Customer group deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete customer group.');

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