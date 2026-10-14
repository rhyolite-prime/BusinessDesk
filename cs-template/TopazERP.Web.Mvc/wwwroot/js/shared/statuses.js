let vue = new Vue({
        el: '#app',
        data: {
            isShimmerLoading: false,
            payload: {},
            statusList: [
                {id: 1, name: 'Active'},
                {id: 2, name: 'Inactive'},
                {id: 3, name: 'Dormant'},
            ]
    },

    methods: {

        getSetupData() {
                this.renderTable(this.statusList);
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "name", headerText: "Status", validationRules: { required: true, minlength: 1 }, width: 80 },
                    /*{ field: "tenantId", visible: false, headerText: "tenantId", width: 15, },*/

                ],
               /* endAdd: (args) => {

                    this.saveStatus(args.data);
                },
                endEdit: (args) => {

                    this.updateStatus(args.data);
                },
                endDelete: (args) => {

                    this.delStatus(args.data.id);
                },*/
            });

        },

      /*  saveStatus(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/SharedResource/CreateStatus/', payload).then(response => {

                this.getSetupData();

                if (response.data.code == 200) {
                    this.toastHandler('', 'Status saved.');

                }
                else {
                    this.toastHandler('error', response.data.message);

                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save suffix.');

            });
        },

        updateStatus(payload) {

            axios.post('/SharedResource/UpdateStatus', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Status updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update Status.');

            });
        },

        delStatus(id) {

            axios.get('/SharedResource/DelStatus?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Status deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete Status.');

            });
        },*/

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

    created() {

        this.getSetupData();
    },
});