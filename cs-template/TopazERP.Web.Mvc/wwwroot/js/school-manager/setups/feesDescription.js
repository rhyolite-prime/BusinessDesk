const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            feesDescriptionList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SchMainSetups/ListAllFeesDescriptions').then(response => {
                this.feesDescriptionList = response.data;
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
                pageSettings: { pageSize: 20, pageSizeList: [10, 20, 50, 100] },
                scrollSettings: { width: "800px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "description", headerText: "Description", validationRules: { required: true }, width: 150 },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => this.saveFeesDescription(args.data),
                endEdit: (args) => this.updateFeesDescription(args.data),
                endDelete: (args) => this.delFeesDescription(args.data.id)
            });
        },

        saveFeesDescription(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SchMainSetups/CreateFeesDescription/', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updateFeesDescription(payload) {
            axios.post('/SchMainSetups/UpdateFeesDescription/', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delFeesDescription(id) {
            axios.get('/SchMainSetups/DeleteFeesDescription?id=' + id).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data deleted.');
            }).catch(() => this.toastHandler('error', 'Unable to delete data.'));
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = { closeButton: true, progressBar: true, showMethod: 'fadeIn', hideMethod: 'fadeOut', timeOut: 10000 };
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