
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetGratuity').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get gratuity.');

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
                    { field: "minYears", headerText: "Minimum Years", textAlign: ej.TextAlign.Left, width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100.00 } },
                    { field: "maxYears", headerText: "Maximum Years", textAlign: ej.TextAlign.Left, width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100.00 } },
                    { field: "factor", headerText: 'Factor', textAlign: ej.TextAlign.Left, width: 100, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100000 } },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveGratuity(args.data);
                },
                endEdit: (args) => {

                    this.updateGratuity(args.data);
                },
                endDelete: (args) => {

                    this.delGratuity(args.data.id);
                },
            });

        },

        saveGratuity(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/PayrollSetups/CreateGratuity', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Gratuity saved.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to save gratuity.');

            });
        },

        updateGratuity(payload) {

            axios.post('/PayrollSetups/UpdateGratuity', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Gratuity updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update gratuity.');

            });
        },

        delGratuity(id) {

            axios.get('/PayrollSetups/DelGratuity?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Gratuity deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete gratuity.');

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

    created() {

        this.getSetupData();

    },
});