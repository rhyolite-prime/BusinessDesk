const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            invoiceList: [],
            invoiceId: '',
            detailsList: [],
            supplierList: [],
            supplierId: '',
            supplierName: '',
            accountNumber: '',
            invoiceNumber: '',
            invoiceDate: moment().format("YYYY-MM-DD"),
            projectedPayDate: moment(this.invoiceDate).add(1, 'months').format("YYYY-MM-DD"),
            balance: '0',
            purchaseOrderNumber: '',
            currencyList: [],
            currencyId: '',
            totalInvoiceAmount: '0',
            amount: '0',
            referenceNumber: '',
            description: '',
            isVatWithheld: false,
            unitPrice: '0',
            quantity: '0',
            subTotal: ' 0',
            paidAmount: '0',
            vatAmount: '0',
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
            batchNumber: '',
            discountAsPercentage: false,
            discount: '0',
            departments: [],
            debitAccountName: '',
            invoiceDetailId: '',
            taxLevyList: [],
            vatId: '',
            vatName: 'None',
            vatList: [],
            vatRate: '15',
            vatIsApplied: false,
            invoiceEdithList: [],
            invoiceBalance: '0',
        }
    },
    methods:{
        getGridData() {
            // Fetch invoices first
            axios.get('/ApEnquiries/GetInvoices').then(response => {
                this.invoiceList = response.data
                    .filter((invoice) => invoice.isCanceled === true)
                    .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));

                this.detailsList = [];
                //this.taxLevyList = [];
                this.invoiceDetailsMap = {};
                // this.invoiceTaxMap = {};

                // Process invoice data
                this.invoiceList.forEach((invoice) => {
                    invoice.invoiceId = invoice.id;
                    invoice.invoiceDate = this.formatDate(invoice.invoiceDate);
                    invoice.projectedPayDate = this.formatDate(invoice.projectedPayDate);
                    invoice.canceledDate = this.formatDate(invoice.canceledDate);
                    invoice.paidAmount = invoice.paidAmount + invoice.withheldAmount;
                    this.invoiceDetailsMap[invoice.id] = invoice.invoiceDetails.map((detail) => {
                        detail.invoiceId = invoice.id;
                        this.detailsList.push(detail);
                        return detail;
                    });
                });
                this.initializeGridTable(this.invoiceList);
            }).catch(err => {
                this.toastHandler('error', 'Unable to get invoices.');
            });
        },
        formatNumber(number) {
            if (number < 0) {
                return `(${Math.abs(number).toFixed(2)})`;
            }
            return number;
        },
        initializeGridTable(responseData) {
            const formattedData = responseData.map(item => ({
                ...item,
                balance: this.formatNumber(item.balance),
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
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                childGrid: {
                    dataSource: this.detailsList,
                    queryString: "invoiceId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                    columns: [
                        { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true, width: 80 },
                        { field: "invoiceId", headerText: 'Invoice Id', visible: false, width: 80 },
                        { field: "referenceNumber", headerText: 'Ref No', textAlign: ej.TextAlign.Left, width: 60 },
                        { field: "description", headerText: "Description", width: 80},
                        { field: "quantity", headerText: "Quantity", width: 80, },
                        { field: "unitPrice", headerText: "Unit Price", width: 80, format: "{0:n2}"},
                        { field: "discount", headerText: "Disc. %", width: 65, format: "{0:n2}"},
                        { field: "amount", headerText: "Disc. Amt.", width: 65, format: "{0:n2}"},
                        { field: "subTotal", headerText: "Sub Total",width: 80, format: "{0:n2}" },
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    {field: "isPosted", headerText: "Posted", width: 35, type: "boolean",},
                    { field: "invoiceDate", headerText: "Invoice Date", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "projectedPayDate", headerText: "Projected Pay Date", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "supplierName", headerText: "Supplier", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "invoiceNumber", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75, visible: false },
                    { field: "buyRate", headerText: "Currency Rate",format: "{0:n2}", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "totalInvoiceAmount", headerText: "Total Amount", width: 80, format: "{0:n2}" },
                    { field: "balance", headerText: "Balance", width: 80, format: "{0:n2}" },
                    { field: "batchNumber", headerText: "Batch N0.", width: 65 },
                    { field: "canceledDate", headerText: "Canceled Date", width: 75, format: "{0:yyyy-MM-dd}"},
                    { field: "canceledBy", headerText: "Canceled By", width: 75 },
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
        this.getGridData();
    }
});
app.mount('#app');