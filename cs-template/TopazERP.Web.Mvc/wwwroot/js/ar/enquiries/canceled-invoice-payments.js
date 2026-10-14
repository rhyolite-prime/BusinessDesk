const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            paymentList: [],
            paymentInvoiceList: [],
        };
    },
    methods:{
        getPayments() {
            axios.get('/ArDataEntry/GetInvoicePayments')
                .then(response => {
                    this.paymentList = response.data.filter(payment => payment.isCanceled === true);

                    this.paymentInvoiceList = [];
                    this.paymentInvoiceDetailsMap = {};
                    this.paymentList.forEach(payment => {
                        payment.paymentId = payment.id;
                        payment.paymentDate = this.formatDate(payment.paymentDate);
                        payment.canceledDate = this.formatDate(payment.canceledDate);
                        this.paymentInvoiceDetailsMap[payment.id] = payment.invoiceList.map(detail => {
                            detail.paymentId = payment.id;
                            this.paymentInvoiceList.push(detail);
                            return detail;
                        });
                    });
                    this.renderTable(this.paymentList);
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get payments.');
                });
        },
        formatNumber(number) {
            if (number < 0) {
                return `(${Math.abs(number).toFixed(2)})`;
            }
            return number;
        },
        renderTable(responseData) {
            const formattedData = responseData.map(item => ({
                ...item,
                outstandingCreditMemo: this.formatNumber(item.outstandingCreditMemo),
            }));
            $("#dataTable2").ejGrid({
                dataSource: formattedData,
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
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                childGrid: {
                    dataSource: this.paymentInvoiceList,
                    queryString: "paymentId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [
                        { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true, width: 80 },
                        { field: "paymentId", headerText: 'Payment Id', visible: false, width: 80 },
                        { field: "invoiceNumber", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 75 },
                        { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75, visible: false },
                        { field: "buyRate", headerText: "Currency Rate",format: "{0:n2}", textAlign: ej.TextAlign.Left, width: 75 },
                        { field: "totalInvoiceAmount", headerText: "Total Amount", width: 80, format: "{0:n2}" },
                        { field: "balance", headerText: "Balance", width: 80, format: "{0:n2}" },
                        { field: "batchNumber", headerText: "Batch N0.", width: 65 },
                        { field: "voucherNumber", headerText: "Voucher No.", width: 65 },
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    {field: "isPosted", headerText: "Posted", width: 35, type: "boolean"},
                    { field: "paymentDate", headerText: "Date", width: 75, format: "{0:yyyy-MM-dd}"},
                    { field: "customerName", headerText: "Customer", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "currencyName", headerText: "Currency", width: 65 },
                    { field: "amountToPay", headerText: "Amount", width: 65, format: "{0:n2}" },
                    { field: "batchNumber", headerText: "Batch Number", width: 75 },
                    { field: "canceledDate", headerText: "Canceled Date", width: 75, format: "{0:yyyy-MM-dd}"},
                    { field: "canceledBy", headerText: "Canceled By", width: 75 },
                    { field: "tenantId", visible: false, headerText: "Tenant Id", width: 15 }
                ],

            });
        },
        formatDate(dateInput) {

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

   mounted() {
        this.getPayments();
    }
});
app.mount('#app');