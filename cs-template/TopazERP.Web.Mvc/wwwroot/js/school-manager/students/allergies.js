const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            allergyList: [],
        }
    },

    methods: {
        getSetupData() {
            axios.get('/SmStudentSetups/ListAllAllergy')
                .then(response => {
                    this.allergyList = response.data;
                    this.dataTable(response.data);
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data.');
                });
        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
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
                    { field: "name", headerText: "Allergy Name", validationRules: { required: true }, width: 150 },
                    { field: "tenantId", visible: false }
                ],

                endAdd: (args) => {
                    this.saveAllergy(args.data);
                },
                endEdit: (args) => {
                    this.updateAllergy(args.data);
                },
                endDelete: (args) => {
                    this.deleteAllergy(args.data.id);
                }
            });
        },

        saveAllergy(payload) {
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmStudentSetups/CreateAllergy', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.getSetupData();
                        this.toastHandler('', 'data saved.');
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to save data.');
                });
        },

        updateAllergy(payload) {
            axios.post('/SmStudentSetups/UpdateAllergy', payload)
                .then(response => {
                    this.getSetupData();
                    this.toastHandler('', 'Allergy updated.');
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to update data.');
                });
        },

        deleteAllergy(id) {
            axios.get('/SmStudentSetups/DeleteAllergy?id=' + id)
                .then(response => {
                    this.getSetupData();
                    this.toastHandler('', 'Allergy deleted.');
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to delete data.');
                });
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };
            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error': toastr.error('', message); break;
                default: toastr.success('', message); break;
            }
        },
    },

    mounted() {
        this.getSetupData();
    },
});
app.mount('#app');