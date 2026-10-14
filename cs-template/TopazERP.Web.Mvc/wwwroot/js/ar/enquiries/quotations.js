const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            detailsList: [],
            customerList: [],
            customerId: '',
            taxLevyList: [],
            taxLevyMap: {},
            detailsMap: {},
        }
    },
    methods:{
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        getQuotations() {
            return axios.get('/ArDataEntry/GetQuotations').then(response =>
            {
                this.quotationList = response.data;
                this.detailsList = [];
                this.taxLevyList = [];
                this.detailsMap = {};
                this.taxLevyMap = {};
                this.quotationList.forEach((quotation) =>
                {
                    quotation.quotationId = quotation.id;
                    quotation.buyRate = parseFloat(quotation.buyRate).toFixed(4);
                    quotation.quotationDate = this.formatDate(quotation.quotationDate);
                    quotation.displayText = `${quotation.customerName} - ${quotation.quotationNumber}`;
                    this.detailsMap[quotation.id] = quotation.details.map((detail) => {
                        detail.quotationId = quotation.id;
                        this.detailsList.push(detail);
                        return detail;
                    });

                });
                this.renderTable(this.quotationList);
            })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get quotations.');
                    throw err;
                });
        },
        
        renderTable(quotationList) {
            $("#dataTable").ejGrid({
                dataSource: quotationList,
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
                        { field: "quantity", headerText: "Quantity", width: 80, },
                        { field: "unitPrice", headerText: "Unit Price", width: 80, format: "{0:n2}"},
                        { field: "discount", headerText: "Disc. %", width: 65, format: "{0:n2}"},
                        { field: "amount", headerText: "Disc. Amt.", width: 65, format: "{0:n2}"},
                        { field: "subTotal", headerText: "Sub Total",width: 80, format: "{0:n2}" },
                    ],
                },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true },
                    {field: "isConvertedToInvoice", headerText: "Is Invoiced?", width: 35, type: "boolean",},
                    { field: "quotationDate", headerText: "Date", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "customerName", headerText: "Customer", textAlign: ej.TextAlign.Left, width: 75, visible:false},
                    { field: "quotationNumber", headerText: "Quotation Number", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "buyRate", headerText: "Currency Rate",format: "{0:n4}", textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "tenantId", visible: false, headerText: "Tenant Id", width: 15 }
                ],
            });
        },
      
        toastHandler(type, message = 'An unexpected error occurred.') {
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
        this.getQuotations();
    }
});
app.mount('#app');