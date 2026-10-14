Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        title: ''

    },
    validations() {

        return {

            title: {
                required
            },
            
        }

    },
    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetTaxTables').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get tax tables.');

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
                    { field: "rate", headerText: "Rate (%)", textAlign: ej.TextAlign.Left, width: 75, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100.00 } },
                    { field: "upperLimitOfAmount", headerText: 'Upper Limit Of Amount', textAlign: ej.TextAlign.Left, width: 100, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100000000000000000000000000000000000000000000000000000000000000.00 } },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveTaxTable(args.data);
                },
                endEdit: (args) => {

                    this.updateTaxTable(args.data);
                },
                endDelete: (args) => {

                    this.delTaxTable(args.data.id);
                },
            });

        },

        initTaxTableHistory() {

            $('#taxTableHistorical').modal('show');

        },

        saveToHistory() {

            this.isLoading = true;

            axios.get(`/PayrollSetups/SaveTaxTableHistory?title=${this.title}`).then(response => {

                this.toastHandler('', 'Tax history saved');

                this.isLoading = false;

                $('#taxTableHistorical').modal('hide');


            }).catch(err => {

                this.toastHandler('error', 'Unable to save tax history');

            });

        },

        saveTaxTable(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/PayrollSetups/CreateTaxTable', payload).then(response => {

                this.getSetupData();
                this.toastHandler('', 'Tax table saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save tax table.');

            });
        },

        updateTaxTable(payload) {

            axios.post('/PayrollSetups/UpdateTaxTable', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Tax table updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update tax table.');

            });
        },

        delTaxTable(id) {

            axios.get('/PayrollSetups/DelTaxTable?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Tax table deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete tax table.');

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