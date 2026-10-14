const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            payload: {},
            startDate: moment().format("YYYY-MM-DD"),
            agingInterval: 30,
            agingData: [],
        }
    },

    methods: {
        getAgingData() {
          let url = `/ApReports/GetAgeingByDate?startDate=${this.startDate}&agingInterval=${this.agingInterval}`
            axios.get(url).then(response => {
                this.agingData = response.data.reportDetails.invoices;
                   this. dataTable(this.agingData);
                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data');
                this.isLoading = false;

            });
        },

        dataTable(responseData) {
            const interval = parseInt(this.agingInterval);
            const first = interval;
            const second = interval * 2;
            const third = interval * 3;

            if ($("#dataTable").data("ejGrid")) {
                $("#dataTable").ejGrid("destroy");
            }

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
                    groupedColumns: ["currencyCode"],
                    showDropArea: false
                },
                scrollSettings: { width: "1200px", height: "400px" },
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                },
                columns: [
                    { field: "currencyCode", headerText: "Currency", visible: false },
                    { field: "invoiceNumber", headerText: "Invoice Number", textAlign: ej.TextAlign.Left, width: 120 },
                    { field: "invoiceDate", headerText: "Invoice Date", textAlign: ej.TextAlign.Left, width: 100 },
                    { field: "purchaseOrderNumber", headerText: "PO Number", textAlign: ej.TextAlign.Left, width: 100 },
                    { field: "totalInvoiceAmount", headerText: "Amount", format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 100 },
                    { field: "paidAmount", headerText: "Paid", format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 100 },
                    { field: "balance", headerText: "Balance", format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 100 },
                    { field: "currentDay", headerText: "Current", format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 100 },
                    { field: "agingFirst", headerText: `${first} Days`, format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 100 },
                    { field: "agingSecond", headerText: `${second} Days`, format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 100 },
                    { field: "agingThird", headerText: `${third}+ Days`, format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 100 }
                ],
                summaryRows: [{
                    summaryColumns: [
                        {
                            summaryType: ej.Grid.SummaryType.Sum,
                            displayColumn: "totalInvoiceAmount",
                            dataMember: "totalInvoiceAmount",
                            prefix: " ",
                            format: "{0:n2}"
                        },
                        {
                            summaryType: ej.Grid.SummaryType.Sum,
                            displayColumn: "paidAmount",
                            dataMember: "paidAmount",
                            prefix: " ",
                            format: "{0:n2}"
                        },
                        {
                            summaryType: ej.Grid.SummaryType.Sum,
                            displayColumn: "balance",
                            dataMember: "balance",
                            prefix: " ",
                            format: "{0:n2}"
                        },
                        {
                            summaryType: ej.Grid.SummaryType.Sum,
                            displayColumn: "currentDay",
                            dataMember: "currentDay",
                            prefix: " ",
                            format: "{0:n2}"
                        },
                        {
                            summaryType: ej.Grid.SummaryType.Sum,
                            displayColumn: "agingFirst",
                            dataMember: "agingFirst",
                            prefix: " ",
                            format: "{0:n2}"
                        },
                        {
                            summaryType: ej.Grid.SummaryType.Sum,
                            displayColumn: "agingSecond",
                            dataMember: "agingSecond",
                            prefix: " ",
                            format: "{0:n2}"
                        },
                        {
                            summaryType: ej.Grid.SummaryType.Sum,
                            displayColumn: "agingThird",
                            dataMember: "agingThird",
                            prefix: " ",
                            format: "{0:n2}"
                        }
                    ],
                    showCaptionSummary: false,   
                    showTotalSummary: false,    
                    summaryRowsTitle: "Group Totals"
                }]
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

        this.getAgingData();
       

    },
});
app.mount('#app');