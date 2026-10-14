const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            statuses: [],
        }
    },

    methods: {
        getSetupData() {
            axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`)
                .then(response => {
                    this.statuses = response.data;
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
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [
                        ej.Grid.ToolBarItems.Search
                    ]
                },
                columns: [
                    { field: "id", headerText: "ID", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Status Name", validationRules: { required: true }, width: 150 },
                  
                ],
            });
        },

      /*  saveStatus(payload) {
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmStudentSetups/CreateStudentStaus', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved.');
                        this.getSetupData();
                    } else {
                        this.toastHandler('error', response.data.message);
                        this.getSetupData();
                    }
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to save data.');
                    this.getSetupData();
                });
        },

        updateStatus(payload) {
            axios.post('/SmStudentSetups/UpdateStudentStatus/', payload)
                .then(response => {
                    this.toastHandler('', 'Status updated.');
                    this.getSetupData();
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to update data.');
                    this.getSetupData();
                });
        },

        deleteStatus(id) {
            axios.get('/SmStudentSetups/DeleteStudentStatus?id=' + id)
                .then(response => {
                    this.getSetupData();
                    this.toastHandler('', 'Status deleted.');
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to delete data.');
                });
        },*/

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