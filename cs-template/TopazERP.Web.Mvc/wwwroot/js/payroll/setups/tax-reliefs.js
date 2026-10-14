
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetTaxReliefs').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get tax reliefs.');

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
                    { field: "name", headerText: 'Tax Relief', textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "amount", headerText: "Amount", textAlign: ej.TextAlign.Left, width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100.00 } },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveTaxRelief(args.data);
                },
                endEdit: (args) => {

                    this.updateTaxRelief(args.data);
                },
                endDelete: (args) => {

                    this.delTaxRelief(args.data.id);
                },
            });

        },

        saveTaxRelief(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/PayrollSetups/CreateTaxRelief', payload).then(response => {

                this.getSetupData();

                if (response.data.code == 200) {

                    this.toastHandler('', 'Tax relief saved.');

                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save tax relief.');

            });
        },

        updateTaxRelief(payload) {

            axios.post('/PayrollSetups/UpdateTaxRelief', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Tax relief updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update tax relief.');

            });
        },

        delTaxRelief(id) {

            axios.get('/PayrollSetups/DelTaxRelief?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Tax relief deleted.');

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