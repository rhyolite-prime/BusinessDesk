const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            voucherList: [],
            voucherDetails: [],
            voucherDetailsMap: {},
        }
    },
    methods: {
        getVouchers() {
            axios.get('/ApDataEntry/GetVouchers')
                .then(response => {
                    this.voucherList = response.data
                        .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));

                    this.voucherDetails = [];
                    this.voucherDetailsMap = {};

                    this.voucherList.forEach((voucher) => {
                        // Build child entries instead of using voucher.details
                        const details = [
                            {
                                id: voucher.id,
                                account: voucher.liabilityAccountName, // liability GL
                                description: voucher.description,
                                debitAmount: voucher.invoiceAmount,
                                creditAmount: 0,
                                buyRate: voucher.buyRate
                            },
                            {
                                id: voucher.id,
                                account: voucher.bankAccountName, // bank GL
                                description: voucher.description,
                                debitAmount:0 ,
                                creditAmount: voucher.netAmount,
                                buyRate: voucher.buyRate
                            },
                            {
                                id: voucher.id,
                                account: voucher.vatWithHoldAccountName, // VAT withheld
                                description: "Withholding VAT",
                                debitAmount: 0,
                                creditAmount: voucher.vatWithHeld,
                                buyRate: voucher.buyRate
                            },
                            {
                                id: voucher.id,
                                account: voucher.creditAccountName, // Withholding Tax
                                description: "Withholding Amount",
                                debitAmount: 0,
                                creditAmount: voucher.withHeld,
                                ou: voucher.ou,
                                referenceNumber: voucher.invoiceNumber,
                                buyRate: voucher.buyRate
                            }
                        ];

                        // Save details in map and master list
                        this.voucherDetailsMap[voucher.id] = details;
                        this.voucherDetails.push(...details);

                        // Display text for dropdown
                        voucher.displayText = `${voucher.supplierName} - ${voucher.voucherNumber}`;
                        //dates
                        voucher.voucherEntryDate = this.formatDate(voucher.voucherEntryDate);
                        voucher.paymentDate = this.formatDate(voucher.paymentDate);
                    });

                    // Build grid
                    this.dataTable(this.voucherList, this.voucherDetails);

                    // Dropdown
                    $("#voucherId").ejDropDownList({
                        dataSource: this.voucherList,
                        watermarkText: "Select Voucher",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.voucherId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get invoices.');
                });
        },
      
        dataTable(responseData, voucherDetails) {
            if ($("#dataTable").data("ejGrid")) {
                $("#dataTable").ejGrid("destroy");
            }
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowGrouping: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                groupSettings: {
                    groupedColumns: ["payCurrencyName"],
                    showDropArea: false
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                childGrid: {
                    dataSource: voucherDetails,
                    queryString: "id",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    editSettings: {},
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [
                        { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true },
                        { field: "account", headerText: "Account", width: 100 },
                        { field: "description", headerText: 'Description', textAlign: ej.TextAlign.Left, width: 120 },
                        { field: "debitAmount", headerText: "Debit Amount", width: 80, format: "{0:n2}" },
                        { field: "creditAmount", headerText: "Credit Amount", width: 80, format: "{0:n2}" },
                        { field: "buyRate", headerText: "Buy Rate", format: "{0:n4}", width: 80 }
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    { field: "batchNumber", headerText: "Batch Number", width: 65 },
                    { field: "voucherEntryDate", headerText: "Entry Date", width: 75, format: "{0:yyyy-MM-dd}" },
                    { field: "supplierName", headerText: "Recipient", textAlign: ej.TextAlign.Left, width: 85 },
                    { field: "payCurrencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "chequeNumber", headerText: "Cheque No.", width: 65, textAlign: ej.TextAlign.Left, },
                    { field: "tenantId", visible: false, headerText: "Tenant Id", width: 15 }
                ],
              
            });
        },
      
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

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
                case 'info':
                    toastr.info('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },
       
    },

    mounted() {
        this.getVouchers();
    }

});
app.mount('#app');  