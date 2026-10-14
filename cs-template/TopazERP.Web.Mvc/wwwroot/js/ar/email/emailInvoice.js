const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            customerId: '',
            isLoading: false,
            invoiceId: '',
            invoiceList: [],
            pdfUrl: '',
            selectedInvoiceList: [],
            sendMultipleInvoices: true,
        }
    },

    methods: {
        toggleSendMultipleInvoices() {
            this.sendMultipleInvoices = !this.sendMultipleInvoices;
            this.getInvoices();
        },
        getCustomers() {
            axios.get('/SharedResource/GetCustomers').then(response =>
            {
                this.customerList = response.data.sort((a, b) => a.name.localeCompare(b.name)).filter(a => a.status.trim().toLowerCase() === 'active');
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
            }).catch(err =>
            {
                this.toastHandler('error', 'Unable to get customers.');
            });
        },
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        getInvoices() {
            return axios.get('/ArDataEntry/GetInvoices').then(response =>
            {
                this.invoiceList = response.data
                    .filter(a => a.customerId === this.customerId && a.isCanceled === false)
                    .sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
                this.detailsList = [];
                this.invoiceDetailsMap = {};
                this.invoiceList.forEach((invoice) =>
                {
                    invoice.invoiceId = invoice.id;
                    invoice.totalInvoiceAmount = parseFloat(invoice.totalInvoiceAmount).toFixed(2);
                    invoice.balance = parseFloat(invoice.balance).toFixed(2);
                    invoice.amountToPay = parseFloat(invoice.amountToPay).toFixed(2);
                    invoice.displayText = `${invoice.customerName} - ${invoice.invoiceNumber}`;
                    invoice.invoiceDate = this.formatDate(invoice.invoiceDate);
                    invoice.projectedPayDate = this.formatDate(invoice.projectedPayDate);

                    this.invoiceDetailsMap[invoice.id] = invoice.details.map((detail) => {
                        detail.invoiceId = invoice.id;
                        this.detailsList.push(detail);
                        return detail;
                    });
                });
                this.dataTable(this.invoiceList);
                $("#invoiceId").ejDropDownList({
                    dataSource: this.invoiceList,
                    watermarkText: "Select Invoice Number",
                    width: "100%",
                    fields: { id: "id", text: "displayText", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.invoiceId = args.value;
                    }
                });
                return this.invoiceList;
            })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get invoices.');
                    throw err;
                });
        },
        dispatchInvoice(){

            this.isLoading = true;
            let payload = {};
            if (this.sendMultipleInvoices) {
                this.getSelectedInvoices();
                if (this.selectedInvoiceList.length === 0) {
                    this.toastHandler('warning', 'No invoice selected for dispatch.');
                    this.isLoading = false;
                    return;
                }
                payload.sendMultipleInvoices = true;
                payload.customerId = this.customerId;
                payload.invoiceIds = this.selectedInvoiceList.map(a => a.id);
            }else {
                let selectedInvoice = this.invoiceList.find(a => a.id === this.invoiceId);
                if (!selectedInvoice) {
                    this.toastHandler('warning', 'Please select an invoice before dispatching.');
                    this.isLoading = false;
                    return;
                }
            payload.sendMultipleInvoices = false;
            payload.customerId = this.customerId;
            payload.invoiceIds = [selectedInvoice.id];
            }
            axios.post('/ArEmail/DispatchInvoice/', payload).then(response => {

                if (response.data && response.data.code === 200) {
                    this.toastHandler('', response.data.message);
                } else {
                    this.toastHandler('warning', response.data.message || 'Unexpected response.');
                }
            })
                .catch(error => {
                    this.toastHandler('error', 'Unable to dispatch invoice.');
                })
                .finally(() => {
                    this.isLoading = false;
                });

        },
        getSelectedInvoices() {

            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedInvoiceList = [];
            let check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
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
        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
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
                        { field: "quantity", headerText: "Quantity", width: 65, format: "{0:n2}"},
                        { field: "amount", headerText: "Unit Price", width: 65, format: "{0:n2}"},
                        { field: "subTotal", headerText: "Sub Total", width: 65, format: "{0:n2}"},


                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    { type: "checkbox", width: 20, },
                    { field: "invoiceNumber", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "buyRate", headerText: "Currency Rate",format: "{0:n4}", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "totalInvoiceAmount", headerText: "Total Amount", width: 80, format: "{0:n2}" },
                    { field: "balance", headerText: "Balance", width: 80, format: "{0:n2}" },
                    { field: "voucherNumber", headerText: "Voucher No.", width: 65 },
                    { field: "batchNumber", headerText: "Batch No.", width: 65 },
                    { field: "invoiceDate", headerText: "Invoice Date", width: 75, format: "{0:yyyy-MM-dd}" },
                    { field: "projectedPayDate", headerText: "Projected Pay Date", width: 75, format: "{0:yyyy-MM-dd}" },
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
    watch: {
       customerId() {
            this.getInvoices();
        }
       


    },
    mounted() {

        this.getInvoices();
        this.getCustomers();


    },
});
app.mount('#app');