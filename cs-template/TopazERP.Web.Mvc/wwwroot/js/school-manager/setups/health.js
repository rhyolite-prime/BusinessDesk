const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            heathList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllHealths/').then(response => {

                this.heathList = response.data;
                this.dataTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data.');

            });

        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "id", width: 25, visible: false, isPrimaryKey: true,  },
                    { field: "name", headerText: "Health", validationRules: { required: true, minlength: 1 }, width: 75},
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveHealth(args.data);
                },
                endEdit: (args) => {
                    this.updateHealth(args.data);
                },
                endDelete: (args) => {
                    this.delHealth(args.data.id);
                }
            });
        },

        saveHealth(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateHealth', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to save data.');
            });
        },

        updateHealth(payload) {


            axios.post('/SmMainSetups/UpdateHealth', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'data updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update data.');

            });
        },

        delHealth(id) {

            axios.get('/SmMainSetups/DeleteHealth?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'data deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete data.');

            });
        },
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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