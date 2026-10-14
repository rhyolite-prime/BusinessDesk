const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            offenceList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllOffences').then(response => {
                this.offenceList = response.data;
                this.dataTable(response.data);
            }).catch(() => {
                this.toastHandler('error', 'Unable to get data.');
            });
        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: { pageSize: 20 },
                scrollSettings: { width: "800px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel] },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Offence", validationRules: { required: true }, width: 200 },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => this.saveOffence(args.data),
                endEdit: (args) => this.updateOffence(args.data),
                endDelete: (args) => this.delOffence(args.data.id)
            });
        },

        saveOffence(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateOffence', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updateOffence(payload) {
            axios.post('/SmMainSetups/UpdateOffence', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delOffence(id) {
            axios.get('/SmMainSetups/DeleteOffence?id=' + id).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data deleted.');
            }).catch(() => this.toastHandler('error', 'Unable to delete data.'));
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 10000 };
            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error': toastr.error('', message); break;
                default: toastr.success('', message); break;
            }
        }
    },

    mounted() {
        this.getSetupData();
    }
});
app.mount('#app');