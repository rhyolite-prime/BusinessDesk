//vue js for invoices

var vue = new Vue({
    el: '#app',
    data: {
        selectedWithHoldings: [],
        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        invoiceList: [],
        invoiceId: '',
        detailsList: [],
        supplierList: [],
        withHoldingList: [],
        supplierId : '',
        supplierName: '',
        accountNumber: '',
        invoiceNumber: '',
        paymentDate: moment().format("YYYY-MM-DD"),
        balance: '0',
        purchaseOrderNumber: '',
        currencyList: [],
        currencyId: '',
        totalInvoiceAmount: '0',
        amountToPay: '0',
        referenceNumber: '0',
        description: '',
        isVatWithheld: false,
        unitPrice: '0',
        quantity: '0',
        subTotal: ' 0',
        ouId: '',
        ouList: [],
        ouName: '',
        departmentHierachyList: [],
        ouNameList: [],
        debitAccountList: [],
        debitAccountId: '',
        date: moment().format("YYYY-MM-DD"),
        address: '',
        voucherNumber: '',
        batchNumber:'0',
        discount: '0',
        departments: [],
        debitAccountName:'',
        invoiceEdithList: [],
        chequeNumber: '',
        bankAccountId: this.emptyGuid,
        bankAccountName: '',
        bankAccountNumber: '',
        isPosted: false,
        invoiceTypeList: [],
        invoiceType: '',
        cash: true,
        cheque: false,
        selectedInvoiceList: [],
        outstandingCreditMemo: '0',
        withholdingId: '',
        modeOfPayment: 'Cash',
        isAutomatic: false,
        filteredInvoices: [],
        invoiceTypeId: '',
        amountToApply: '0',
        withHoldingId: '',
    },
    methods:{
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        getPayments() {
            axios.get('/ArDataEntry/GetWithHoldingPayments/')
                .then(response => {
                    this.withHoldingList = response.data;
                    this.paymentInvoiceList = [];
                    this.paymentInvoiceDetailsMap = {};
                    this.withHoldingList.forEach(payment => {
                        payment.withHoldingId = payment.id;
                        payment.paymentDate = this.formatDate(payment.paymentDate);
                        this.paymentInvoiceDetailsMap[payment.id] = payment.invoiceList.map(detail => {
                            detail.withHoldingId = payment.id;
                            detail.buyRate = detail.buyRate.toFixed(4);
                            this.paymentInvoiceList.push(detail);
                            return detail;
                        });
                    });
                    this.renderTable(this.withHoldingList);
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get payments.');
                });
        },

        delPayment(id) {
            axios.post('/ApDataEntry/DeleteWithHoldingPayment?id='+id)
                .then(response => {

                    this.toastHandler('', 'Payment deleted.');
                    this.getWithHoldingsPayments
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to delete invoice.');
                });
        },
        renderTable(responseData) {
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
                    groupedColumns: ["currencyName"],
                    showDropArea: false
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                childGrid: {
                    dataSource: this.paymentInvoiceList,
                    queryString: "withHoldingId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [
                        { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true, width: 80 },
                        { field: "invoiceNumber", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 75 },
                        { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75 },
                        { field: "buyRate", headerText: "Currency Rate",format: "{0:n2}", textAlign: ej.TextAlign.Left, width: 75 },
                        { field: "totalInvoiceAmount", headerText: "Total Amount", width: 80, format: "{0:n2}" },
                        { field: "balance", headerText: "Balance", width: 80, format: "{0:n2}" },
                        { field: "batchNumber", headerText: "Batch N0.", width: 65 },
                        { field: "voucherNumber", headerText: "Voucher No.", width: 65 },
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    { field: "isPosted", headerText: "Posted", width: 35, type: "boolean",},
                    { field: "customerName", headerText: "Supplier", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "currencyName", headerText: "Currency", width: 65, visible: false },
                    { field: "amountToApply", headerText: "Amount To Apply", width: 65, format: "{0:n2}" },
                    { field: "paymentDate", headerText: "Payment Date", width: 75, format: "{0:yyyy-MM-dd}"},
                    { field: "modeOfPayment", headerText: "Mode of Payment", width: 75 },
                    { field: "outstandingCreditMemo", headerText: "Outstanding Credit Memo", width: 75, format: "{0:n2}" },
                    { field: "tenantId", visible: false, headerText: "Tenant Id", width: 15 }
                ],
                endDelete: (args) => {
                    this.delPayment(args.data.id);
                }

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
        this.getPayments();
    }
});