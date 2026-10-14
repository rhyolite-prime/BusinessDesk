const app = Vue.createApp({
    data() {
        return {
            disabilityList: [],
        }
    },

    methods: {
        getSetupData() {
            axios.get('/SmStudentSetups/ListAllDisability')
                .then(res => {
                    this.disabilityList = res.data;
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
                    { field: "name", headerText: "Disability Name", validationRules: { required: true } },
                    { field: "tenantId", visible: false }
                ],

                endAdd: (args) => this.saveDisability(args.data),
                endEdit: (args) => this.updateDisability(args.data),
                endDelete: (args) => this.deleteDisability(args.data.id)
            });
        },

        saveDisability(payload) {
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmStudentSetups/CreateDisability', payload)
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

        updateDisability(payload) {
            axios.post('/SmStudentSetups/UpdateDisability', payload)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'Disability updated.');
                })
                .catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        deleteDisability(id) {
            axios.get('/SmStudentSetups/DeleteDisability?id=' + id)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'Disability deleted.');
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