const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            customerId: '',
            isLoading: false,
            paymentId: '',
            paymentList: [],
            pdfUrl: '',
            selectedPaymentList: [],
            sendMultiplePayment: true,
            customerList: [],
        }
    },

    methods: {
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
        getPayments() {
            axios.get('/ArDataEntry/GetInvoicePayments')
                .then(response => {
                    this.paymentList = response.data.filter(payment => payment.isCanceled === false && payment.customerId === this.customerId);
                    
                    this.paymentInvoiceList = [];
                    this.paymentInvoiceDetailsMap = {};
                    this.paymentList.forEach(payment => {
                        payment.paymentId = payment.id;
                        payment.paymentDate = this.formatDate(payment.paymentDate);
                        payment.displayName = `${payment.customerName} - ${payment.batchNumber}`;

                        // Map details
                        this.paymentInvoiceDetailsMap[payment.id] = payment.invoiceList.map(detail => {
                            detail.paymentId = payment.id;
                            this.paymentInvoiceList.push(detail);
                            return detail;
                        });
                    });
                    this.dataTable(this.paymentList);
                    $("#paymentId").ejDropDownList({
                        dataSource: this.paymentList,
                        watermarkText: "Select Payment Batch No.",
                        width: "100%",
                        fields: { id: "id", text: "displayName", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.paymentId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get payments.');
                });
        },
        dispatchReceipts() {
            this.getSelectedPayments();  
            if (!this.selectedPaymentList.length) {
                this.toastHandler('warning', 'Please select at least one payment.');
                return;
            }
            if (!this.customerId || this.customerId === this.emptyGuid) {
                this.toastHandler('warning', 'Please select customer.');
                return;
            }

            this.isLoading = true;
            const params = {
                customerId: this.customerId,
                paymentIds: this.selectedPaymentList.map(p => p.id),
            };
            axios.post('/ArEmail/DispatchPaymentReceipt', params)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('success', response.data.message);
                        this.pdfUrl = response.data.pdfUrl || null;
                        if (this.pdfUrl) {
                            setTimeout(() => {
                                window.open(this.pdfUrl, '_blank');
                            }, 1000);
                        }
                    } else {
                        this.toastHandler('error', response.data.message || 'Failed to send receipt email(s).');
                    }
                })
                .catch(err => {
                    this.toastHandler('error', 'An error occurred while sending receipt email(s).');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        getSelectedPayments() {

            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedPaymentList = [];
            let check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.selectedPaymentList = rec;

        },
        getRecords(pageInx, inx, proxy, rec) {

            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);
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
                        { field: "totalInvoiceAmount", headerText: "Total Amount", width: 80, format: "{0:n2}" },
                        { field: "paidAmount", headerText: "Paid Amount", width: 80, format: "{0:n2}" },
                        { field: "balance", headerText: "Balance", width: 80, format: "{0:n2}" },
                        { field: "batchNumber", headerText: "Batch N0.", width: 65 },
                        { field: "voucherNumber", headerText: "Voucher No.", width: 65 },
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    { type: "checkbox", width: 20, },
                    { field: "customerName", headerText: "Customer", textAlign: ej.TextAlign.Left, width: 75 },
                    {field: "bankAccountName", headerText: "Bank G/L", width: 80, textAlign: ej.TextAlign.Left},
                    { field: "amountToPay", headerText: "Amount", width: 65, format: "{0:n2}" },
                    { field: "paymentDate", headerText: "Payment Date", width: 75, format: "{0:yyyy-MM-dd}"},
                    { field: "batchNumber", headerText: "Batch Number", width: 75 },
                    { field: "modeOfPayment", headerText: "Mode of Payment", width: 75 },
                    {field: "isPosted", headerText: "Posted", width: 35, type: "boolean",},
                    { field: "tenantId", visible: false, headerText: "Tenant Id", width: 15 },
                ]

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
            this.getPayments();
        }



    },
    mounted() {
        this.getPayments();
        this.getCustomers();
    },
});
app.mount('#app');