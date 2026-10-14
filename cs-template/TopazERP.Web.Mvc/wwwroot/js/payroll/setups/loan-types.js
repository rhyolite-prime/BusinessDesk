
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetLoanTypes').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get loan types.');

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
                    { field: "name", headerText: "Loan Type", validationRules: { required: true, minlength: 2 }, width: 75 },
                    { field: "chargeInterest", headerText: 'Charge Interest ?', textAlign: ej.TextAlign.Center, width: 75, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveLoanType(args.data);
                },
                endEdit: (args) => {

                    this.updateLoanType(args.data);
                },
                endDelete: (args) => {

                    this.delLoanType(args.data.id);
                },
            });

        },

        saveLoanType(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/PayrollSetups/CreateLoanType', payload).then(response => {

                this.getSetupData();

                if (response.data.code === 200) {

                    this.toastHandler('', 'Loan type saved.');

                }
                else {

                    this.toastHandler('error', response.data.message);
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save loan type.');

            });
        },

        updateLoanType(payload) {

            axios.post('/PayrollSetups/UpdateLoanType', payload).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Loan type cant be deleted.');

                    this.toastHandler('error', 'Loan type has been referenced in other records.');
                }
                else
                {
                    this.toastHandler('', 'Loan type deleted.');
                }
                
                this.getSetupData();

                

            }).catch(err => {

                this.toastHandler('error', 'Unable to update loan type.');

            });
        },

        delLoanType(id) {

            axios.get('/PayrollSetups/DelLoanType?id=' + id).then(response => {

                if(response.data.code !== 200)
                {
                    this.toastHandler('error', 'Loan type cant be deleted.');

                    this.toastHandler('error', 'Loan type has been referenced in other records.');
                }
                else
                {
                    this.toastHandler('', 'Loan type deleted.');
                }
                
                this.getSetupData();


            }).catch(err => {

                this.toastHandler('error', 'Unable to delete loan type.');

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