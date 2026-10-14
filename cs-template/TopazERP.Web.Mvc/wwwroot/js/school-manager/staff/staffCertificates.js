const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            certificateList: [],
            payload: {},
        }
    },
    methods: {

        getCertificates() {
            this.isShimmerLoading = true;
            axios.get('/SmStaffSetups/ListAllCertificates').then(response => {
                this.certificateList = response.data;
                this.dataTable(response.data);
                this.isShimmerLoading = false;
            }).catch(err => {
                this.toastHandler('error', 'Unable to load certificates.');
                this.isShimmerLoading = false;
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
                scrollSettings: { width: "600px", height: "400px" },
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
                    { field: "id", headerText: "ID", isPrimaryKey: true, visible: false, width: 15 },
                    { field: "name", headerText: "Certificate Name", validationRules: { required: true }, width: 100 },
                    { field: "tenantId", visible: false, headerText: "TenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveCertificate(args.data);
                },
                endEdit: (args) => {
                    this.updateCertificate(args.data);
                },
                endDelete: (args) => {
                    this.delCertificate(args.data.id);
                }
            });
        },

        saveCertificate(payload) {
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmStaffSetups/CreateCertificate', payload).then(response => {
               
                if (response.data.code === 200) {
                    this.getCertificates();
                    this.toastHandler('', 'Certificate saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to save certificate.');
            });
        },

        updateCertificate(payload) {
            axios.post('/SmStaffSetups/UpdateCertificate', payload).then(response => {
                this.getCertificates();
                this.toastHandler('', 'Certificate updated.');
            }).catch(err => {
                this.toastHandler('error', 'Unable to update certificate.');
            });
        },

        delCertificate(id) {
            axios.get('/SmStaffSetups/DeleteCertificate?id=' + id).then(response => {
                this.getCertificates();
                this.toastHandler('', 'Certificate deleted.');
            }).catch(err => {
                this.toastHandler('error', 'Unable to delete certificate.');
            });
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 5000,
            };

            switch (type) {
                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }
        },

    },

    mounted() {
        this.getCertificates();
    },
});
app.mount('#app');