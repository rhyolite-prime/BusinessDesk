let vue = new Vue({
        el: '#app',
        data: {
            isShimmerLoading: false,
            payload: {},
            currencyRates: [],
    },

    methods: {

        getSetupData() {

            axios.get('/SharedResource/GetCurrencys').then(response => {


                this.currencyRates = [];

                if (response.data) {


                    response.data.forEach((header) => {

                        header.headerId = header.id;
                        header.rates.forEach((detail) => {

                            detail.headerId = header.id
                            detail.createdAt = this.formatShortDate(detail.createdAt);

                            this.currencyRates.push(detail);
                        });

                    });




                    this.renderTable(response.data, this.currencyRates);

                }



            }).catch(err => {

                this.toastHandler('error', 'Unable to get currency.');

            });
        },

        renderTable(responseData1, responseData2) {

            $("#dataTable").ejGrid({

                dataSource: responseData1,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                childGrid: {
                    dataSource: responseData2,
                    queryString: "headerId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    columns: [

                        { field: "id", headerText: 'id', isPrimaryKey: true, visible: false, textAlign: ej.TextAlign.Left, width: 10 },
                        { field: "buyingRate", headerText: "Buy Rate", editType: "numericedit", editParams: { decimalPlaces: 4 }, validationRules: { required: true, }, width: 55 },
                        { field: "sellingRate", headerText: "Sell Rate",format: "{0:n4}", editType: "numericedit", editParams: { decimalPlaces: 4 }, validationRules: { required: true, }, width: 55 },
                        { field: "createdAt", headerText: "Created At",format: "{0:n4}", editType: "numericedit", editParams: { decimalPlaces: 4 }, validationRules: { required: true, }, width: 55 },
                    ]

                },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "currencyName", headerText: "Currency Name", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "currencyCode", headerText: "Currency Code", validationRules: { required: true, minlength: 1 }, width: 55 },
                    { field: "minorName", headerText: "Minor Name", validationRules: { required: true, minlength: 1 }, width: 65 },
                    { field: "buyRate", headerText: "Buy Rate", format: "{0:n4}", editType: "numericedit", editParams: { decimalPlaces: 4 },validationRules: { required: true,} , width: 55 },
                    { field: "sellRate", headerText: "Sell Rate", format: "{0:n4}", editType: "numericedit", editParams: { decimalPlaces: 4 },validationRules: { required: true,}, width: 55 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    this.saveCurrency(args.data);
                },
                endEdit: (args) => {

                    this.updateCurrency(args.data);
                },
                endDelete: (args) => {

                    this.delCurrency(args.data.id);
                },
            });

        },

        saveCurrency(payload) {

            delete payload.id;
            delete payload.tenantId;
            payload.Rates = [{ id: this.uuid(), createdAt: moment().format("DD-MMM-YYYY"), sellingRate : payload.sellRate, buyingRate: payload.buyRate }];

            axios.post('/SharedResource/CreateCurrency', payload).then(response => {

                this.getSetupData();
                this.toastHandler('', 'Currency saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save currency.');

            });
        },

        updateCurrency(payload) {

            payload.Rates = [{ id: this.uuid(), createdAt: moment().format("DD-MMM-YYYY"), sellingRate : payload.sellRate, buyingRate: payload.buyRate }];

            axios.post('/SharedResource/UpdateCurrency', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Currency updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update currency.');

            });
        },

        delCurrency(id) {

            axios.get('/SharedResource/DelCurrency?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Currency deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete currency.');

            });
        },
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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

    computed() {

        this.getSetupData();
    },
});
