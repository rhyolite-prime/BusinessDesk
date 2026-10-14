
let vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        voucherList: [],
    },

    methods: {

        getData() {

            axios.get('/LedgerDataEntry/GetUnpaidWithholdingVoucher').then(response => {

                 this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve unpaid withholding vouchers.');

            });
        },

        renderTable(responseData) {

            $( "#dataTable" ).ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.Print ] },
                summaryRows: [

                    {
                        title: "Total", summaryColumns: [
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "total", dataMember: "total", format: "{0:n2}" },
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "net", dataMember: "net", format: "{0:n2}" },
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "withHeld", dataMember: "withHeld", format: "{0:n2}" },
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "vatNhil", dataMember: "vatNhil", format: "{0:n2}" },
                        ]
                    },

                ],
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "receipient", headerText: "Receipient", width: 65 },
                    { field: "voucherEntryDate", headerText: "Voucher Entry Date", width: 75 },
                    { field: "batchNo", headerText: "Batch #", width: 55 },
                    { field: "accountName", headerText: "Bank GL", width: 65 },
                    { field: "bank", headerText: "Bank", width: 65 },
                    { field: "chequeDate", headerText: "Cheque Date", width: 65 },
                    { field: "cheque", headerText: "Cheque No", width: 65 },
                    { field: "total", headerText: "Total", format: "{0:n2}",width: 65 },
                    { field: "net", headerText: "Net", format: "{0:n2}", width: 65 },
                    { field: "withHeld", headerText: "With Held", format: "{0:n2}", width: 65 },
                    { field: "vatNhil", headerText: "VAT/NHIL", format: "{0:n2}", width: 65 },
                    { field: "ouName", headerText: "Organizational Unit(Dept)", width: 65 },
                    { field: "modeOfPayment", headerText: "Mode of Payment", width: 65 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],

            } );

        },

         
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

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

        this.getData();

    },
});