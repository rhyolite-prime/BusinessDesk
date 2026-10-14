const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            alertConfig: {
                type: '',
                alertMessage: null,
                showAlert: false,
                timeout: 5000
            },
        }
    },
    methods: {
        getSetupData() {

            axios.get('/schsetups/GetLevels').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get levels.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "name", headerText: "Level", validationRules: { required: true, minlength: 1 }, width: 80 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.savelevel(args.data);
                },
                endEdit: (args) => {

                    this.updatelevel(args.data);
                },
                endDelete: (args) => {

                    this.dellevel(args.data.id);
                },
            });

        },

        savelevel(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/schsetups/CreateLevel', payload).then(response => {

                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save level.');

            });
        },

        updatelevel(payload) {

            axios.post('/schsetups/UpdateLevel', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Level updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update level.');

            });
        },

        dellevel(id) {

            axios.get('/schsetups/DelLevel?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Level deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete level.');

            });
        },

        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
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

        this.getSetupData();
    },
});
app.mount('#app');