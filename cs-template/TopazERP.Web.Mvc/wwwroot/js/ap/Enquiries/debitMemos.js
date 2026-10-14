const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            invoiceList: [],
            invoiceId: '',
            supplierList: [],
            supplierId: '',
            supplierName: '',
            accountNo: '',
            invoiceNo: '',
            currencyList: [],
            currencyId: '',
            currencyName: '',
            buyRate: '',
            sellRate: '',
            invoiceCurrencyId: '',
            invoiceCurrencyName: '',
            invoiceBuyRate: '',
            invoiceAmount: '',
            invoiceBalance: '',
            balance: '',
            description: '',
            debitGlId: this.emptyGuid,
            creditGlId: this.emptyGuid,
            bankList: [],
            bankBranchList: [],
            bankId: '',
            bankName: '',
            bankBranchId: '',
            amount: '0.00',
            transactionDate: moment().format("YYYY-MM-DD"),
            modeOfPayment: 'Cash',
            chequeNumber: '00000000',
            cash: true,
            cheque: false,
            invoiceDate: moment().format("YYYY-MM-DD"),
            debitMemoList: [],
            debitMemoId: '',
            chequeDate: moment().format("YYYY-MM-DD"),
            ouList: [],
            ouNameList: [],
            departmentHierachyList: [],
            ouName: '',
            ouId: '',
            isInvoiceDebit: false,
            costCenterHierachyList: [],
            costCenterList: [],
            accountsList: [],
            bankAccountId: '',
            bankAccountName: '',
        }
    },
    methods: {
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        getMemo() {
            axios.get('/ApDataEntry/GetDebitMemos')
                .then(response => {
                    this.debitMemoList = response.data

                    //format date
                    this.debitMemoList.forEach((item) => {
                        item.transactionDate = this.formatDate(item.transactionDate);
                        if(item.isInvoiceDebit === true) {
                            item.applied = 'Yes';
                        }
                        else {
                            item.applied = 'No';
                        }
                    });
                    this.dataTable(this.debitMemoList);

                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get debitMemos.');
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
                    {field: "applied", headerText: "Applied?", width: 75, textAlign: ej.TextAlign.Left},
                    { field: "supplierName", headerText: "Supplier", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "description", headerText: "Description", textAlign: ej.TextAlign.Left, width: 150 },
                    { field: "transactionDate", headerText: "Date", textAlign: ej.TextAlign.Left, width: 75},
                    { field: "invoiceNo", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75, visible: false},
                    { field: "buyRate", headerText: "Rate",format: "{0:n4}", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "amount", headerText: "Payment Amount", width: 80, format: "{0:n4}" },
                    { field: "debitGlName", headerText: "Debit GL", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "creditGlName", headerText: "Credit GL", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "tenantId", visible: false, headerText: "Tenant Id", width: 15 }
                ],
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
   
    mounted() {
       
        this.getMemo();
      
    }

});
app.mount('#app');
    