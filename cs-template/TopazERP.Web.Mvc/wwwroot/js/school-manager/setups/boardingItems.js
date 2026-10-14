const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            alertConfig: {
                type: '',
                alertMessage: null,
                showAlert: false,
                timeout: 5000
            },
            billTypeList: [],
            selectedBillType: '',
        }
    },

    methods: {
        getSetupData() {

            axios.get('/SmMainSetups/GetBoardingItems').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get boarding items.');

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
                    { field: "name", headerText: "Boarding Item", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveBoardingItem(args.data);
                },
                endEdit: (args) => {

                    this.updateBoardingItem(args.data);
                },
                endDelete: (args) => {

                    this.delBoardingItem(args.data.id);
                },
            });

        },

        saveBoardingItem(payload) {

            delete payload.id;
            delete payload.tenantId;


            axios.post('/SmMainSetups/CreateBoardingItem', payload).then(response => {

                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save item.');

            });
        },

        updateBoardingItem(payload) {

            axios.post('/SmMainSetups/UpdateBoardingItem', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'item updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update item.');

            });
        },

        delBoardingItem(id) {

            axios.get('/SmMainSetups/DeleteBoardingItem?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'item deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete item.');

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

    mounted() {

        this.getSetupData();
    },
});
app.mount('#app');