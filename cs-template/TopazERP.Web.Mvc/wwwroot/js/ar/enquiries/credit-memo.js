const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            creditMemoList: [],
        }
    },
    methods: {
        getMemo() {
            axios.get('/ArDataEntry/GetCreditMemo')
                .then(response => {
                    this.creditMemoList = response.data;

                    //format date
                    this.creditMemoList.forEach((item) => {
                        item.transactionDate = this.formatDate(item.transactionDate);
                        item.displayText = `${item.customerName} - ${item.invoiceNo} - ${item.amount}`;
                    });
                    this.dataTable(this.creditMemoList);
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get Credit Memos.');
                });
        },

        dataTable(responseData) {
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
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    { field: "isInvoiceDebit", headerText: "Applied", textAlign: ej.TextAlign.Center, width: 75, type: "boolean", format: "{0:bool}" },
                    { field: "customerName", headerText: "Customer", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "transactionDate", headerText: "Date Applied", textAlign: ej.TextAlign.Left, width: 75},
                    { field: "invoiceNo", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "invoiceBalance", headerText: "Invoice Balance", width: 80, format: "{0:n2}" },
                    { field: "currencyName", headerText: "Pay Currency", textAlign: ej.TextAlign.Left, width: 75, visible: false },
                    { field: "buyRate", headerText: "Pay Currency Rate",format: "{0:n4}", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "amount", headerText: "Payment Amount", width: 80, format: "{0:n4}" },
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
                default:
                    toastr.success('', message);
                    break;
            }

        },
    },
    mounted() {
        this.getMemo();
    }

});
app.mount('#app');

    