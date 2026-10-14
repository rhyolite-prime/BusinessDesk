const app = Vue.createApp({
    data() {
        return {
            payload: {},
            languageList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllLanguages').then(response => {
                this.languageList = response.data;
                this.dataTable(response.data);
            }).catch(() => this.toastHandler('error', 'Unable to get data.'));
        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true, allowSorting: true, isResponsive: true,
                pageSettings: { pageSize: 20 },
                scrollSettings: { width: "800px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel] },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Language", validationRules: { required: true }, width: 200 },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => this.saveLanguage(args.data),
                endEdit: (args) => this.updateLanguage(args.data),
                endDelete: (args) => this.delLanguage(args.data.id)
            });
        },

        saveLanguage(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateLanguage', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updateLanguage(payload) {
            axios.post('/SmMainSetups/UpdateLanguage', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delLanguage(id) {
            axios.get('/SmMainSetups/DeleteLanguage?id=' + id).then(() => {
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