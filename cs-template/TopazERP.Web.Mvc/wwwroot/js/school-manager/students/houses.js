const app = Vue.createApp({
    data() {
        return {
            houseList: [],
        }
    },

    methods: {
        getSetupData() {
            axios.get('/SmStudentSetups/ListAllHouses/')
                .then(res => {
                    this.houseList = res.data;
                    this.dataTable(res.data);
                })
                .catch(() => this.toastHandler('error', 'Unable to get data.'));
        },

        dataTable(data) {
            $("#dataTable").ejGrid({
                dataSource: data,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: { pageSize: 20 },
                scrollSettings: { width: "1200px", height: "400px" },
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
                    { field: "id", headerText: "ID", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "House Name", validationRules: { required: true } },
                    { field: "tenantId", visible: false }
                ],

                endAdd: (args) => this.saveHouse(args.data),
                endEdit: (args) => this.updateHouse(args.data),
                endDelete: (args) => this.deleteHouse(args.data.id)
            });
        },

        saveHouse(payload) {
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmStudentSetups/CreateHouse/', payload)
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

        updateHouse(payload) {
            axios.post('/SmStudentSetups/UpdateHouse', payload)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'House updated.');
                })
                .catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        deleteHouse(id) {
            axios.get('/SmStudentSetups/DeleteHouse?id=' + id)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'House deleted.');
                })
                .catch(() => this.toastHandler('error', 'Unable to delete data.'));
        },

        toastHandler(type, message) {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 8000 };
            type === 'error' ? toastr.error('', message) : toastr.success('', message);
        }
    },

    mounted() {
        this.getSetupData();
    },
});
app.mount('#app');