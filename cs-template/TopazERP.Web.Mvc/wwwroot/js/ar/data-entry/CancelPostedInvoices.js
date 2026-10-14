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
            customerList: [],
            customerId: '',
            customerName: '',
            accountNumber: '',
            isCanceled: false,
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
            invoiceNumber: '',
            detailsId: '',
            isOu: true,
            selectedInvoiceList: [],
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            reportPath: '',
        }
    },
    methods:{
        getSelectedInvoices() {
            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedInvoiceList = [];
            let check = obj.checkSelectedRowsIndexes;
            if (check.length)
            {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }
            this.selectedInvoiceList = rec;
        },
        getRecords(pageInx, inx, proxy, rec) {
            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;
        },
        getPostedInvoices() {
            axios.get('/ArDataEntry/GetInvoices').then(response => {
                this.invoiceList = response.data.filter(invoice => invoice.isCanceled === false && invoice.totalInvoiceAmount === invoice.balance && invoice.isPosted === true);
                this.detailsList = [];
                this.invoiceDetailsMap = {};
                this.invoiceList.forEach((invoice) => {
                    invoice.invoiceId = invoice.id;
                    invoice.invoiceDate = this.formatDate(invoice.invoiceDate);
                    invoice.projectedPayDate = this.formatDate(invoice.projectedPayDate);
                    invoice.displayName = `${invoice.invoiceNumber} - ${invoice.customerName}`;
                    this.invoiceDetailsMap[invoice.id] = invoice.details.map((detail) => {
                        detail.invoiceId = invoice.id;
                        this.detailsList.push(detail);
                        return detail;
                    });
                });

                this.renderTable(this.invoiceList);
            }).catch(err => {
                this.toastHandler('error', 'Unable to get invoices.');
            });
        },
        getInvoices() {
            axios.get('/ArDataEntry/GetInvoices').then(response => {
                this.invoiceList = response.data.filter(invoice => invoice.customerId === this.customerId && invoice.isCanceled === false && invoice.totalInvoiceAmount === invoice.balance && invoice.isPosted === true);
                this.detailsList = [];
                this.invoiceDetailsMap = {};
                this.invoiceList.forEach((invoice) => {
                    invoice.invoiceId = invoice.id;
                    invoice.invoiceDate = this.formatDate(invoice.invoiceDate);
                    invoice.projectedPayDate = this.formatDate(invoice.projectedPayDate);
                    invoice.displayName = `${invoice.invoiceNumber} - ${invoice.customerName}`;
                    this.invoiceDetailsMap[invoice.id] = invoice.details.map((detail) => {
                        detail.invoiceId = invoice.id;
                        this.detailsList.push(detail);
                        return detail;
                    });
                });

                this.renderTable(this.invoiceList);
            }).catch(err => {
                this.toastHandler('error', 'Unable to get invoices.');
            });
        },
        renderTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
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
                        { field: "referenceNo", headerText: 'Ref No', textAlign: ej.TextAlign.Left, width: 60 },
                        { field: "description", headerText: "Description", width: 80},
                        {field: "creditAccountName", headerText: "Credit G/L", width: 80, textAlign: ej.TextAlign.Left},
                        { field: "quantity", headerText: "Quantity", width: 80, },
                        { field: "amount", headerText: "Unit Price", width: 80, format: "{0:n2}"},
                        { field: "subTotal", headerText: "Sub Total",width: 80, format: "{0:n2}" },
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    { type: "checkbox", width: 20, },
                    { field: "invoiceDate", headerText: "Invoice Date", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "projectedPayDate", headerText: "Projected Pay Date", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "customerName", headerText: "Customer", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "invoiceNumber", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 75 },
                    {field:  "ouName", headerText: "OU/Cost Center", textAlign: ej.TextAlign.Left, width: 75,},
                    { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "buyRate", headerText: "Currency Rate",format: "{0:n2}", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "totalInvoiceAmount", headerText: "Total Amount", width: 80, format: "{0:n2}" },
                    { field: "paidAmount", headerText: "Paid Amount", width: 80, format: "{0:n2}" },
                    { field: "balance", headerText: "Balance", width: 80, format: "{0:n2}" },
                    { field: "batchNumber", headerText: "Batch N0.", width: 65 },
                    { field: "voucherNumber", headerText: "Voucher No.", width: 65 },
                    {field:  "isPosted", headerText: "Posted", width: 35, type: "boolean",},
                    { field: "tenantId", visible: false, headerText: "Tenant Id", width: 15 }
                ],
            });
        },
        getCustomers() {
            axios.get('/SharedResource/GetCustomers')
                .then(response => {
                    this.customerList = response.data.sort((a, b) => a.name.localeCompare(b.name));
                    $("#customerId").ejDropDownList({
                        dataSource: response.data,
                        watermarkText: "Select Customer",
                        width: "100%",
                        fields: { id: "id", text: "name", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.customerId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get customer.');
                });
        },
        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");

        },
        cancelInvoice() {
            this.getSelectedInvoices();

            // Check if any invoice is selected
            if (!this.selectedInvoiceList.length) {
                this.toastHandler('warning', 'Please select invoice(s) to cancel.');
                return;
            }

            this.isLoading = true;

            let payload = {
                invoiceIds: this.selectedInvoiceList.map(a => a.id)
            };

            axios.post('/ArDataEntry/CancelInvoices', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('success', response.data.message);
                        this.getPostedInvoices();
                    } else {
                        this.toastHandler('warning', response.data.message);
                    }
                    this.isLoading = false;
                    $('#addEdit').modal('hide');
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to cancel invoice.');
                    this.isLoading = false;
                });

        },

        clearForm() {
            window.location.reload();
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
    watch: {
        customerId(val) {

            if (val) {
                this.getInvoices();
            }

        },
    },
   mounted() {
        this.getPostedInvoices();
        this.getCustomers();
    }
});
app.mount('#app');