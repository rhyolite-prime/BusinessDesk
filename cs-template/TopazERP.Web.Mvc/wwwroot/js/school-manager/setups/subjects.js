const app = Vue.createApp({
    data() {
        return {
            payload: {},
            subjectList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllSubjects').then(response => {
                this.subjectList = response.data;
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
                enableAltRow: true,
                scrollSettings: { width: "1000px", height: "400px" },

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
                        ej.Grid.ToolBarItems.Cancel
                    ]
                },

                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Subject Name", validationRules: { required: true }, width: 200 },
                    { field: "abbreviation", headerText: "Abbreviation", width: 150 },
                    { field: "isCore", headerText: "Is Core", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: "boolean", width: 75 },
                    { field: "isBestSubject", headerText: "Is NBES", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: "boolean", width: 75 },
                    { field: "tenantId", visible: false }
                ],

                // 🔽 ADD THIS
                actionBegin: (args) => {
                    if (args.requestType === "save") {
                        // safety net before save
                        if (args.data.isCore && args.data.isBestSubject) {
                            this.toastHandler(
                                'warning',
                                'A subject cannot be both Core and NBES.'
                            );
                            args.cancel = true;
                        }
                    }
                },

                // 🔽 THIS IS THE KEY PART
                actionComplete: (args) => {
                    if (args.requestType === "beginedit" || args.requestType === "add") {

                        const grid = $("#dataTable").ejGrid("instance");
                        
                        $("input[name='isCore']").on("change", function () {
                            if (this.checked) {
                                $("input[name='isBestSubject']").prop("checked", false);
                            }
                        });
                        
                        $("input[name='isBestSubject']").on("change", function () {
                            if (this.checked) {
                                $("input[name='isCore']").prop("checked", false);
                            }
                        });
                    }
                },

                endAdd: (args) => this.saveSubject(args.data),
                endEdit: (args) => this.updateSubject(args.data),
                endDelete: (args) => this.delSubject(args.data.id)
            });
        },


        saveSubject(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateSubject', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData()
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updateSubject(payload) {
            axios.post('/SmMainSetups/UpdateSubject', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delSubject(id) {
            axios.get('/SmMainSetups/DeleteSubject?id=' + id).then(() => {
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