const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            staffGradeList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get('/SmStaffSetups/ListAllStaffGrades').then(response => {
                this.staffGradeList = response.data;
                this.dataTable(response.data);
            }).catch(err => {
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
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
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
                    { field: "id", headerText: "ID", visible: false, isPrimaryKey: true, width: 15 },
                    { field: "name", headerText: "Grade Name", validationRules: { required: true }, width: 120 },
                    { field: "tenantId", visible: false, headerText: "Tenant ID", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveStaffGrade(args.data);
                },
                endEdit: (args) => {
                    this.updateStaffGrade(args.data);
                },
                endDelete: (args) => {
                    this.delStaffGrade(args.data.id);
                }
            });
        },

        saveStaffGrade(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmStaffSetups/CreateStaffGrade/', payload).then(response => {
               
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'Grade saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to save data.');
            });
        },

        updateStaffGrade(payload) {
            axios.post('/SmStaffSetups/UpdateStaffGrade/', payload).then(response => {
                this.getSetupData();
                this.toastHandler('', 'Grade updated.');
            }).catch(err => {
                this.toastHandler('error', 'Unable to update data.');
            });
        },

        delStaffGrade(id) {
            axios.get('/SmStaffSetups/DeleteStaffGrade?id=' + id).then(response => {
                this.getSetupData();
                this.toastHandler('', 'Grade deleted.');
            }).catch(err => {
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