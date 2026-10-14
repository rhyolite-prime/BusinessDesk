const app = Vue.createApp({
    data() {
        return {
            positionList: [],
        }
    },

    methods: {
        getSetupData() {
            axios.get('/SmStudentSetups/ListAllPosition')
                .then(res => {
                    this.positionList = res.data;
                    this.dataTable(res.data);
                })
                .catch(() => this.toastHandler('error', 'Unable to load data.'));
        },

        dataTable(data) {
            $("#dataTable").ejGrid({
                dataSource: data,
                allowPaging: true,
                allowSorting: true,
                pageSettings: { pageSize: 20 },
                editSettings: {
                    allowEditing: true,
                    allowAdding: true,
                    allowDeleting: true,
                    showDeleteConfirmDialog: true
                },
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [
                        ej.Grid.ToolBarItems.Add,
                        ej.Grid.ToolBarItems.Edit,
                        ej.Grid.ToolBarItems.Delete,
                        ej.Grid.ToolBarItems.Update,
                        ej.Grid.ToolBarItems.Cancel,
                        ej.Grid.ToolBarItems.Search
                    ]
                },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Position Name", validationRules: { required: true } },
                    { field: "tenantId", visible: false }
                ],

                endAdd: (args) => this.savePosition(args.data),
                endEdit: (args) => this.updatePosition(args.data),
                endDelete: (args) => this.deletePosition(args.data.id),
            });
        },

        savePosition(payload) {
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmStudentSetups/CreatePosition', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.getSetupData();
                        this.toastHandler('', 'data saved.');
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updatePosition(payload) {
            axios.post('/SmStudentSetups/UpdatePosition', payload)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'Position updated.');
                })
                .catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        deletePosition(id) {
            axios.get('/SmStudentSetups/DeletePosition?id=' + id)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'Position deleted.');
                })
                .catch(() => this.toastHandler('error', 'Unable to delete data.'));
        },

        toastHandler(type, message) {
            toastr.options = { closeButton: true, progressBar: true };
            type === 'error' ? toastr.error('', message) : toastr.success('', message);
        }
    },

    mounted() {
        this.getSetupData();
    },
});
app.mount('#app');