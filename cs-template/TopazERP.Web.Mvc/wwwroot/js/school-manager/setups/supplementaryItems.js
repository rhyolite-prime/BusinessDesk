const app = Vue.createApp({
    data() {
        return {
            payload: {},
            supplementaryItemList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllSupplementaryItems').then(response => {
                this.supplementaryItemList = response.data;
                this.dataTable(response.data);
            }).catch(() => this.toastHandler('error', 'Unable to get data.'));
        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true, allowSorting: true, isResponsive: true,
                pageSettings: { pageSize: 20 },
                scrollSettings: { width: "900px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel] },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Item Name", validationRules: { required: true }, width: 200 },
                    { field: "isFixed", headerText: "Is Fixed", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean,type: "boolean", width: 75 },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => this.saveSupplementaryItem(args.data),
                endEdit: (args) => this.updateSupplementaryItem(args.data),
                endDelete: (args) => this.delSupplementaryItem(args.data.id)
            });
        },

        saveSupplementaryItem(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateSupplementaryItem', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updateSupplementaryItem(payload) {
            axios.post('/SmMainSetups/UpdateSupplementaryItem', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delSupplementaryItem(id) {
            axios.get('/SmMainSetups/DeleteSupplementaryItem?id=' + id).then(() => {
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