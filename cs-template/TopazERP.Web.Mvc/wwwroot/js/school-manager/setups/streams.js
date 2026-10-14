const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            streamList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllStreams/').then(response => {

                this.streamList = response.data;
                this.dataTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get stream.');

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
                    { field: "name", headerText: "Stream Name", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveStream(args.data);
                },
                endEdit: (args) => {
                    this.updateStream(args.data);
                },
                endDelete: (args) => {
                    this.delStream(args.data.id);
                }
            });
        },

        saveStream(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmMainSetups/CreateStream/', payload).then(response => {

                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save stream.');

            });
        },

        updateStream(payload) {


            axios.post('/SmMainSetups/UpdateStream/', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Stream updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update stream.');

            });
        },

        delStream(id) {

            axios.get('/SmMainSetups/DeleteStream?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Stream deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete stream.');

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