const app = Vue.createApp({
    data() {
        return {
            payload: {},
            ptaPositionList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllPtaPositions').then(response => {
                this.ptaPositionList = response.data;
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
                    { field: "name", headerText: "PTA Position", validationRules: { required: true }, width: 200 },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => this.savePtaPosition(args.data),
                endEdit: (args) => this.updatePtaPosition(args.data),
                endDelete: (args) => this.delPtaPosition(args.data.id)
            });
        },

        savePtaPosition(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreatePtaPosition', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updatePtaPosition(payload) {
            axios.post('/SmMainSetups/UpdatePtaPosition', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delPtaPosition(id) {
            axios.get('/SmMainSetups/DeletePtaPosition?id=' + id).then(() => {
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