const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            customerId: '',
            isLoading: false,
            quotationId: '',
            quotationList: [],
            pdfUrl: '',
            selectedQuotationList: [],
            sendMultipleQuotation: true,
            quotationDetailsMap: {},
            detailsList: [],
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
        getQuotations() {
            return axios.get('/ArDataEntry/GetQuotations').then(response =>
            {
                this.quotationList = response.data.filter(q => q.isConvertedToInvoice === false && q.customerId === this.customerId);
                this.detailsList = [];
                this.quotationDetailsMap = {};
                this.quotationList.forEach((quotation) =>
                {
                    quotation.quotationId = quotation.id;
                    quotation.totalAmount = // Calculate total amount
                        quotation.details.reduce((sum, detail) => sum + (detail.subTotal || 0), 0);
                    
                    quotation.displayText = `${quotation.customerName} - ${quotation.quotationNumber}`;
                    quotation.quotationDate = this.formatDate(quotation.quotationDate);

                    this.quotationDetailsMap[quotation.id] = quotation.details.map((detail) => {
                        detail.quotationId = quotation.id;
                        this.detailsList.push(detail);
                        return detail;
                    });
                });
                this.dataTable(this.quotationList);
                $("#quotationId").ejDropDownList({
                    dataSource: this.quotationList,
                    watermarkText: "Select Quotation Number",
                    width: "100%",
                    fields: { id: "id", text: "displayText", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.quotationId = args.value;
                    }
                });
                return this.quotationList;
            })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get quotations.');
                    throw err;
                });
        },
        dispatchQuotation() {
            this.isLoading = true;
            let payload = {};

          
            this.getSelectedQuotation();

            if (!this.selectedQuotationList.length) {
                this.toastHandler('warning', 'Please select a quotation before dispatching.');
                this.isLoading = false;
                return;
            }

   
            let selected = this.selectedQuotationList[0];

            payload.customerId = this.customerId;
            payload.quotationIds = this.selectedQuotationList.map(q => q.id);

            axios.post('/ArEmail/DispatchQuotation/', payload)
                .then(response => {
                    if (response.data && response.data.code === 200) {
                        this.toastHandler('', response.data.message);
                    } else {
                        this.toastHandler('warning', response.data.message || 'Unexpected response.');
                    }
                })
                .catch(error => {
                    this.toastHandler('error', 'Unable to dispatch quotation.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        getSelectedQuotation() {

            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedQuotationList = [];
            let check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.selectedQuotationList = rec;

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
                    dataSource: this.detailsList,
                    queryString: "quotationId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                    columns: [
                        { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true, width: 80 },
                        { field: "quotationId", headerText: 'Quotation Id', visible: false, width: 80 },
                        { field: "referenceNo", headerText: 'Ref No', textAlign: ej.TextAlign.Left, width: 60 },
                        { field: "description", headerText: "Description", width: 80},
                        { field: "quantity", headerText: "Quantity", width: 65, format: "{0:n2}"},
                        { field: "amount", headerText: "Unit Price", width: 65, format: "{0:n2}"},
                        { field: "subTotal", headerText: "Sub Total", width: 65, format: "{0:n2}"},
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    { type: "checkbox", width: 20, },
                    { field: "quotationNumber", headerText: "Quotation Number", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "buyRate", headerText: "Currency Rate",format: "{0:n4}", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "totalAmount", headerText: "Total Amount", width: 80, format: "{0:n2}" },
                    { field: "quotationDate", headerText: "Date", width: 75, format: "{0:yyyy-MM-dd}" },
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
            this.getQuotations();
        }



    },
    mounted() {
        this.getQuotations();
        this.getCustomers();
    },
});
app.mount('#app');