
let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        payload: {},
        voucherContext: 'supplier',
        proposedJournalEntries: [],
        selectedPaymentVouchersToPost: [],
        selectedEmployeeVouchersToPost: [],
        selectedReceiptVouchersToPost: [],
        supplierPaymentVoucherFilterParams: {
            startDate: new Date(
                new Date().setMonth(new Date().getMonth() - 3)
            ).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
        },
        employeePaymentVoucherFilterParams: {
            startDate: new Date(
                new Date().setMonth(new Date().getMonth() - 3)
            ).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
        },
        customerReceiptVoucherFilterParams: {
            startDate: new Date(
                new Date().setMonth(new Date().getMonth() - 3)
            ).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
        },
    },

    methods: {

        getSupplierPaymentVouchers() {

            this.voucherContext = 'supplier';
            
            axios.get(`/LedgerDataEntry/GetVoucherData?voucherType=${this.voucherContext}&startDate=${this.supplierPaymentVoucherFilterParams.startDate}&endDate=${this.supplierPaymentVoucherFilterParams.endDate}`)
                .then(response => {

                    const vouchers = response.data.map(voucher => {
                        return {
                            ...voucher,
                            // computed field
                            getflNhil: ((voucher.getFundLevyRate/100) * voucher.baseAmount || 0) + ((voucher.nationalHealthInsuranceLevyRate/100) * voucher.baseAmount  || 0)
                        };

                    });

                    this.proposedJournalEntries = [];
                    
                    vouchers.forEach((voucher) => {

                        voucher.proposedJournalEntries.forEach((journalEntry) => {

                            this.proposedJournalEntries.push(journalEntry);

                        });

                    });

                    this.renderSupplierPvTable(vouchers, this.proposedJournalEntries);

                }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve supplier payment vouchers.');

            });
        },

        getEmployeePaymentVouchers() {

            this.voucherContext = 'employee';
            
            axios.get(`/LedgerDataEntry/GetVoucherData?voucherType=${this.voucherContext}&startDate=${this.employeePaymentVoucherFilterParams.startDate}&endDate=${this.employeePaymentVoucherFilterParams.endDate}`).then(response => {

                const vouchers = response.data.map(voucher => {
                    return {
                        ...voucher,
                        // computed field
                        getflNhil: ((voucher.getFundLevyRate/100) * voucher.baseAmount || 0) + ((voucher.nationalHealthInsuranceLevyRate/100) * voucher.baseAmount  || 0)
                    };

                });

                this.proposedJournalEntries = [];

                vouchers.forEach((voucher) => {

                    voucher.proposedJournalEntries.forEach((journalEntry) => {

                        this.proposedJournalEntries.push(journalEntry);

                    });

                });
                
                this.renderEmployeePvTable(vouchers, this.proposedJournalEntries);

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve employee payment vouchers.');

            });
        },

        getCustomerReceiptVouchers() {

            this.voucherContext = 'customer';

            axios.get(`/LedgerDataEntry/GetVoucherData?voucherType=${this.voucherContext}&startDate=${this.customerReceiptVoucherFilterParams.startDate}&endDate=${this.customerReceiptVoucherFilterParams.endDate}`).then(response => {

                this.proposedJournalEntries = [];

                response.data.forEach((voucher) => {

                    voucher.proposedJournalEntries.forEach((journalEntry) => {

                        this.proposedJournalEntries.push(journalEntry);

                    });

                });

                this.renderCustomerReceiptTable(response.data, this.proposedJournalEntries);

            }).catch(err => {

                console.log(err);
                this.toastHandler('error', 'Unable to retrieve customer receipt vouchers.');

            });
        },

        renderSupplierPvTable(responseData, proposedJournalEntries) {

            $("#supplierDataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: {  allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "recipient", headerText: "Supplier Name", width: 80 },
                    { field: "batchNumber", headerText: "Batch No", width: 50 },
                    { field: "voucherEntryDate", headerText: "Date", width: 55 },
                    { field: "currencyName", headerText: "Currency", width: 45 },
                    { field: "grossAmount", headerText: "Gross Amount", format: "{0:n2}", width: 55 },
                    { field: "getflNhil", headerText: "GETFL + NHIL", format: "{0:n2}", width: 55 },
                    { field: "totalVatAmount", headerText: "VAT", format: "{0:n2}", width: 55 },
                    { field: "totalWithheld", headerText: "Withheld", format: "{0:n2}", width: 55 },
                    { field: "totalVatWithheld", headerText: "VAT WH", format: "{0:n2}", width: 55 },
                    { field: "netAmount", headerText: "Net Amount", format: "{0:n2}", width: 55 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                recordDoubleClick: (args) => {
                   console.log(args.data);
                },
                endDelete: (args) => {

                    this.delVoucher(args.data.id);
                },
                rowSelected: (args) => {
                    let gridObj = $("#supplierDataTable").data("ejGrid");
                    this.selectedPaymentVouchersToPost = gridObj.getSelectedRecords();
                },
                rowDeselected: (args) => {
                    let gridObj = $("#supplierDataTable").data("ejGrid");
                    this.selectedPaymentVouchersToPost = gridObj.getSelectedRecords();
                },
                childGrid: {
                    dataSource: proposedJournalEntries,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    editSettings: { allowEditing: false, allowAdding: false, allowDeleting: false, },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search, ] },
                    queryString: "batchNumber",
                    summaryRows: [
                        {
                            title: "Total", summaryColumns: [
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "debitAmount", dataMember: "debitAmount", format: "{0:n2}" },
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "creditAmount", dataMember: "creditAmount", format: "{0:n2}" },
                            ]
                        },
                    ],
                    columns: [

                        { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                        { field: "batchNumber", headerText: "batchNumber", width: 15, visible: false, },
                        { field: "referenceNumber", headerText: "Reference No.", width: 45, },
                        { field: "accountName", headerText: 'Account Name', textAlign: ej.TextAlign.Left, width: 95,},
                        { field: "description", headerText: "Description", width: 110, },
                        { field: "debitAmount", headerText: 'Debit Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, format: "{0:n2}" },
                        { field: "creditAmount", headerText: 'Credit Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, format: "{0:n2}" },
                        { field: "ouName", headerText: 'Organizational Unit', textAlign: ej.TextAlign.Left, width: 95 },
                        { field: "chequeNo", headerText: "Cheque No.", width: 40, },

                    ],
                     

                },
            });

        },

        renderEmployeePvTable(responseData, proposedJournalEntries) {

            $("#employeeDataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: {  allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "recipient", headerText: "Supplier Name", width: 80 },
                    { field: "batchNumber", headerText: "Batch No", width: 50 },
                    { field: "voucherEntryDate", headerText: "Date", width: 55 },
                    { field: "currencyName", headerText: "Currency", width: 45 },
                    { field: "grossAmount", headerText: "Gross Amount", format: "{0:n2}", width: 55 },
                    { field: "getflNhil", headerText: "GETFL + NHIL", format: "{0:n2}", width: 55 },
                    { field: "totalVatAmount", headerText: "VAT", format: "{0:n2}", width: 55 },
                    { field: "totalWithheld", headerText: "Withheld", format: "{0:n2}", width: 55 },
                    { field: "totalVatWithheld", headerText: "VAT WH", format: "{0:n2}", width: 55 },
                    { field: "netAmount", headerText: "Net Amount", format: "{0:n2}", width: 55 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                recordDoubleClick: (args) => {
                    console.log(args.data);
                },
                endDelete: (args) => {

                    this.delVoucher(args.data.id);
                },
                rowSelected: (args) => {
                    let gridObj = $("#employeeDataTable").data("ejGrid");
                    this.selectedEmployeeVouchersToPost = gridObj.getSelectedRecords();
                },
                rowDeselected: (args) => {
                    let gridObj = $("#employeeDataTable").data("ejGrid");
                    this.selectedEmployeeVouchersToPost = gridObj.getSelectedRecords();
                },
                childGrid: {
                    dataSource: proposedJournalEntries,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    editSettings: { allowEditing: false, allowAdding: false, allowDeleting: false, },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search, ] },
                    queryString: "batchNumber",
                    summaryRows: [
                        {
                            title: "Total", summaryColumns: [
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "debitAmount", dataMember: "debitAmount", format: "{0:n2}" },
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "creditAmount", dataMember: "creditAmount", format: "{0:n2}" },
                            ]
                        },
                    ],
                    columns: [

                        { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                        { field: "batchNumber", headerText: "batchNumber", width: 15, visible: false, },
                        { field: "referenceNumber", headerText: "Reference No.", width: 45, },
                        { field: "accountName", headerText: 'Account Name', textAlign: ej.TextAlign.Left, width: 95,},
                        { field: "description", headerText: "Description", width: 110, },
                        { field: "debitAmount", headerText: 'Debit Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, format: "{0:n2}" },
                        { field: "creditAmount", headerText: 'Credit Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, format: "{0:n2}" },
                        { field: "ouName", headerText: 'Organizational Unit', textAlign: ej.TextAlign.Left, width: 95 },
                        { field: "chequeNo", headerText: "Cheque No.", width: 40, },

                    ],


                },
            });

        },

        renderCustomerReceiptTable(responseData, proposedJournalEntries) {

            $("#customerDataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: {  allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "recipient", headerText: "Customer Name", width: 90 },
                    { field: "batchNumber", headerText: "Batch No", width: 50 },
                    { field: "voucherEntryDate", headerText: "Date", width: 55 },
                    { field: "currencyName", headerText: "Currency", width: 45 },
                    { field: "grossAmount", headerText: "Gross Amount", format: "{0:n2}", width: 55 },
                    { field: "netAmount", headerText: "Net Amount", format: "{0:n2}", width: 55 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                recordDoubleClick: (args) => {
                    console.log(args.data);
                },
                endDelete: (args) => {

                    this.delVoucher(args.data.id);
                },
                rowSelected: (args) => {
                    let gridObj = $("#customerDataTable").data("ejGrid");
                    this.selectedReceiptVouchersToPost = gridObj.getSelectedRecords();
                },
                rowDeselected: (args) => {
                    let gridObj = $("#customerDataTable").data("ejGrid");
                    this.selectedReceiptVouchersToPost = gridObj.getSelectedRecords();
                },
                childGrid: {
                    dataSource: proposedJournalEntries,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    editSettings: { allowEditing: false, allowAdding: false, allowDeleting: false, },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search, ] },
                    queryString: "batchNumber",
                    summaryRows: [
                        {
                            title: "Total", summaryColumns: [
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "debitAmount", dataMember: "debitAmount", format: "{0:n2}" },
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "creditAmount", dataMember: "creditAmount", format: "{0:n2}" },
                            ]
                        },
                    ],
                    columns: [

                        { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                        { field: "batchNumber", headerText: "batchNumber", width: 15, visible: false, },
                        { field: "referenceNumber", headerText: "Reference No.", width: 45, },
                        { field: "accountName", headerText: 'Account Name', textAlign: ej.TextAlign.Left, width: 95,},
                        { field: "description", headerText: "Description", width: 110, },
                        { field: "debitAmount", headerText: 'Debit Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, format: "{0:n2}" },
                        { field: "creditAmount", headerText: 'Credit Amount', textAlign: ej.TextAlign.Left, width: 45, defaultValue: 0, format: "{0:n2}" },
                        { field: "ouName", headerText: 'Organizational Unit', textAlign: ej.TextAlign.Left, width: 95 },
                        { field: "chequeNo", headerText: "Cheque No.", width: 40, },

                    ],


                },
            });

        },
        
        delVoucher(id) {

            axios.get('/LedgerDataEntry/DelVoucher?id=' + id).then(response => {

                //call method to reload
                this.getSupplierPaymentVouchers();
                this.toastHandler('success', 'Voucher deleted successfully.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete voucher.');

            });
        },

        deleteSupplierVouchers() {
            let voucherIds = this.selectedPaymentVouchersToPost.map(v => v.id);

            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to delete.');
                return;
            }
            
            this.isShimmerLoading = true;
            
            axios.post('/LedgerDataEntry/DeleteVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers deleted successfully.');
                    this.selectedPaymentVouchersToPost = [];
                    this.getSupplierPaymentVouchers();
                }).catch(err => {
                this.toastHandler('error', 'Unable to post vouchers.');
            });
             
        },

        postSupplierVouchers() {
             
            let voucherIds = this.selectedPaymentVouchersToPost.map(v => v.id);
             
            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to post.');
                return;
            }
            
            axios.post('/LedgerDataEntry/PostVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers posted successfully.');
                    this.selectedPaymentVouchersToPost = [];
                    this.getSupplierPaymentVouchers();
                }).catch(err => {
                    this.toastHandler('error', 'Unable to post vouchers.');
                });
        },

        deleteEmployeeVouchers() {
            
            let voucherIds = this.selectedEmployeeVouchersToPost.map(v => v.id);

            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to delete.');
                return;
            }

            this.isShimmerLoading = true;

            axios.post('/LedgerDataEntry/DeleteVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers deleted successfully.');
                    this.selectedEmployeeVouchersToPost = [];
                    this.getEmployeePaymentVouchers();
                }).catch(err => {
                this.toastHandler('error', 'Unable to post vouchers.');
            });

        },

        postEmployeeVouchers() {

            let voucherIds = this.selectedEmployeeVouchersToPost.map(v => v.id);

            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to post.');
                return;
            }

            axios.post('/LedgerDataEntry/PostVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers posted successfully.');
                    this.selectedEmployeeVouchersToPost = [];
                    this.getEmployeePaymentVouchers();
                }).catch(err => {
                this.toastHandler('error', 'Unable to post vouchers.');
            });
        },

        deleteReceiptVouchers() {

            let voucherIds = this.selectedReceiptVouchersToPost.map(v => v.id);

            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to delete.');
                return;
            }

            this.isShimmerLoading = true;

            axios.post('/LedgerDataEntry/DeleteVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers deleted successfully.');
                    this.selectedReceiptVouchersToPost = [];
                    this.getSupplierPaymentVouchers();
                }).catch(err => {
                this.toastHandler('error', 'Unable to post vouchers.');
            });

        },

        postReceiptVouchers() {

            let voucherIds = this.selectedReceiptVouchersToPost.map(v => v.id);

            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to post.');
                return;
            }

            axios.post('/LedgerDataEntry/PostVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers posted successfully.');
                    this.selectedReceiptVouchersToPost = [];
                    this.getSupplierPaymentVouchers();
                }).catch(err => {
                this.toastHandler('error', 'Unable to post vouchers.');
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

    created() {

        this.getSupplierPaymentVouchers();
        
        //this.getEmployeePaymentVouchers();

    },
});