const app = Vue.createApp({
    data() {
        return {
            supplierList: [],
        };
    },
    methods: {


        //puts a bracket around - numbers
        formatNumber(number) {
            if (number < 0) {
                return `(${Math.abs(number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            }
            return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        //get suppliers
        getSuppliers() {
            axios.get('/ApEnquiries/GetSuppliers')
                .then(response => {
                    this.supplierList = response.data.sort((a, b) => a.name.localeCompare(b.name));
                    this.renderTable(this.supplierList);
                    this.supplierList.forEach(supplier => {
                        supplier.displayName = supplier.name + ' - ' + supplier.accountNumber;
                    });


                    $("#supplierId").ejDropDownList({
                        dataSource: response.data,
                        watermarkText: "Select Supplier",
                        width: "100%",
                        fields: { id: "id", text: "displayName" , value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.supplierId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get suppliers.');
                });
        },
        renderTable(responseData) {
            const formattedData = responseData.map(item => ({
                ...item,
                balance: this.formatNumber(item.balance),
            }));
            $("#dataTable").ejGrid({
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
                    groupedColumns: ["currencyCode"],
                    showDropArea: false
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "accountNumber", headerText: "Account No", width: 65 },
                    { field: "name", headerText: "Supplier Name", width: 80 },
                    { field: "phoneNo", headerText: "Phone No", width: 65 },
                    { field: "email", headerText: "Email", width: 65 },
                    { field: "tinNumber", headerText: "TIN No", width: 65 },
                    { field: "vatNumber", headerText: "Vat No.", width: 65 },
                    { field: "currencyCode", headerText: "Currency", width: 65, visible: false},
                    { field: "balance", headerText: "Balance", width: 65, format: "{0:n2}" },
                    { field: "statusName", headerText: "Status", width: 65 },
                    { field: "address", headerText: "Address", width: 65 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],

                endDelete: (args) => {

                    this.delSupplier(args.data.id);
                },
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
    mounted(){
        this.getSuppliers();
    },
});
app.mount('#app');  
    