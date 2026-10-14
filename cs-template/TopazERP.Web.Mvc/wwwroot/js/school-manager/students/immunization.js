const app = Vue.createApp({
    data() {
        return {
            immunizationList: [],
        }
    },

    methods: {
        getSetupData() {
            axios.get('/SmStudentSetups/ListAllImmunization')
                .then(res => {
                    this.immunizationList = res.data;
                    this.dataTable(res.data);
                })
                .catch(() => this.toastHandler('error', 'Unable to get data.'));
        },

        dataTable(data) {
            $("#dataTable").ejGrid({
                dataSource: data,
                allowPaging: true,
                allowSorting: true,
                pageSettings: { pageSize: 20 },
                isResponsive: true,
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
                    { field: "name", headerText: "Immunization Name", validationRules: { required: true } },
                    { field: "tenantId", visible: false }
                ],

                endAdd: (args) => this.saveImmunization(args.data),
                endEdit: (args) => this.updateImmunization(args.data),
                endDelete: (args) => this.deleteImmunization(args.data.id),
            });
        },

        saveImmunization(payload) {
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmStudentSetups/CreateImmunization', payload)
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

        updateImmunization(payload) {
            axios.post('/SmStudentSetups/UpdateImmunization', payload)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'Immunization updated.');
                })
                .catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        deleteImmunization(id) {
            axios.get('/SmStudentSetups/DeleteImmunization?id=' + id)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'Immunization deleted.');
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