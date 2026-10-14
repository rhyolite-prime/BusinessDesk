const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {}
        }},
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllTitles').then(response => {
                this.dataTable(response.data);
            }).catch(() => this.toastHandler('error', 'Unable to get data.'));
        },
        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: { pageSize: 20 },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel] },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Title", validationRules: { required: true }, width: 120 },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => this.saveTitle(args.data),
                endEdit: (args) => this.updateTitle(args.data),
                endDelete: (args) => this.delTitle(args.data.id)
            });
        },
        saveTitle(payload) {
            delete payload.id; delete payload.tenantId;
            axios.post('/SmMainSetups/CreateTitle', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },
        updateTitle(payload) {
            axios.post('/SmMainSetups/UpdateTitle', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },
        delTitle(id) {
            axios.get('/SmMainSetups/DeleteTitle?id=' + id).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data deleted.');
            }).catch(() => this.toastHandler('error', 'Unable to delete data.'));
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = { closeButton: true, progressBar: true };
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
