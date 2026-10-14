const app = Vue.createApp({
    data() {
        return {
            openingBalanceList: [],
        }
    },
    methods: {

        //get opening balances
        getOpeningBalances() {
            axios.get('/ArDataEntry/GetOpeningBalances')
                .then(response => {
                    this.openingBalanceList = response.data.sort((a, b) => a.customerName.localeCompare(b.customerName));

                    this.openingBalanceList.forEach(item => {
                        item.transactionDate = this.formatDate(item.transactionDate);
                    });
                    this.renderTable(this.openingBalanceList);
                    $("#openingBalanceId").ejDropDownList({
                        dataSource: response.data,
                        watermarkText: "Select Customer",
                        width: "100%",
                        fields: {id: "id", text: "customerName", value: "id"},
                        enableFilterSearch: true,
                        change: (args) => {
                            this.openingBalanceId = args.value;
                        }
                    });
                })
                .catch(error => {
                    console.log(error);
                    this.isLoading = false;
                });
        },

        renderTable(responseData) {

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
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [ej.Grid.ToolBarItems.Search]
                },
                columns: [

                    {field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true,},
                    {field: "isPosted", headerText: "Is Posted", width: 65},
                    {field: "customerName", headerText: "Customer", width: 65},
                    {field: "currencyName", headerText: "Currency", width: 65, visible: false},
                    {field: "buyRate", headerText: "Buy Rate", width: 65, format: "{0:n4}"},
                    {field: "amount", headerText: "Amount", width: 65, format: "{0:n2}"},
                    {field: "ouName", headerText: "OU/Cost Centers", width: 65},
                    {field: "transactionDate", headerText: "Transaction Date", width: 65},
                    {field: "tenantId", visible: false, headerText: "tenantId", width: 15,},
                ],

                endDelete: (args) => {

                    this.delOpeningBalance(args.data.id);
                },
            });

        },

        //formatdate
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
    mounted(){
        this.getOpeningBalances();
    },

});
app.mount('#app');
    