
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/LedgerSetups/GetPettyCashRecipients').then(response => {

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
                    { field: "recipient", headerText: "Recipient Name", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "phoneNo", headerText: "Phone No", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "email", headerText: "Email", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.savePettyCashRecipient(args.data);
                },
                endEdit: (args) => {

                    this.updatePettyCashRecipient(args.data);
                },
                endDelete: (args) => {

                    this.delPettyCashRecipient(args.data.id);
                },
            });

        },

        savePettyCashRecipient(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/LedgerSetups/CreatePettyCashRecipient', payload).then(response => {

                this.getSetupData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to save Petty Cash Recipient.');

            });
        },

        updatePettyCashRecipient(payload) {

            axios.post('/LedgerSetups/UpdatePettyCashRecipient', payload).then(response => {

                this.toastHandler('', 'Petty Cash Recipient updated.');

                this.getSetupData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to update Petty Cash Recipient.');

            });
        },

        delPettyCashRecipient(id) {

            axios.get('/LedgerSetups/DelPettyCashRecipient?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Petty Cash Recipient deleted.');

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