 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isDeleteProcessing: false,
        isTaxHistoryRestoring: false,
        taxHistoryId: '',
        taxHistoryList: [],
        taxTableList: [],
        taxHistoryInfo: null
    },
    
    methods: {

        getTaxTableHistory() {

            axios.get('/PayrollSetups/GetTaxTableHistory').then(response => {

                //response.data.formatEach((v) => {

                //    v.title = `${v.title} - ${this.formatShortDate(v.creationTime)}`

                //});

                this.taxHistoryList = response.data;

                $("#taxHistoryId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Tax History",
                    width: "100%",
                    fields: { id: "id", text: "title", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.taxHistoryId = args.value;
                    }

                });

            }).catch(err => {

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
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
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



        restoreTaxHistory() {

            if (this.taxHistoryInfo) {

                this.isTaxHistoryRestoring = true;

                axios.get('/PayrollSetups/RestoreTaxTableHistory?id=' + this.taxHistoryInfo.id).then(response => {

                    this.toastHandler('', 'Tax table history restored.');

                    this.isTaxHistoryRestoring = false;

                }).catch(err => {

                    this.toastHandler('error', 'Unable to restore tax table history.');

                });

            }

        },

        clearTaxHistory() {


            if (this.taxHistoryInfo) {

                this.isDeleteProcessing = true;

                axios.get('/PayrollSetups/DelTaxTableHistory?id=' + this.taxHistoryInfo.id).then(response => {

                    this.toastHandler('', 'Tax table history deleted.');

                    this.isDeleteProcessing = false;

                    this.getTaxTableHistory();

                    this.renderTable([]);

                }).catch(err => {

                    this.toastHandler('error', 'Unable to delete tax table history.');

                });

            }
            else {

                this.toastHandler('warning', 'No record selected.');

            }
            
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
    filters: {

        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },

    },
    watch: {

        taxHistoryId(val) {

            this.taxHistoryInfo = this.taxHistoryList.find(x => x.id === val);

            if (this.taxHistoryInfo) {

                this.renderTable(this.taxHistoryInfo.taxTableList);
                 
            }

        }


    },
    created() {

        this.getTaxTableHistory();

    },
});