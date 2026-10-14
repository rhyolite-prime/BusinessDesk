
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        journalDetailList: [],
        selectedJournalEntries: [],
        isPostBtnLoading: false,
        isDeleteBtnLoading: false,
        
    },

    methods: {

        getData() {

            axios.get('/LedgerDataEntry/GetUnpostedJournalEntries').then(response => {

                let journalData = response.data.journalData;

                journalData.forEach((journalHeader) => {

                    journalHeader.journalId = journalHeader.id;

                    journalHeader.batchDate = this.formatShortDate(journalHeader.batchDate);

                    journalHeader.journalDetails.forEach((journalDetail) => {

                        journalDetail.journalId = journalHeader.id;

                        journalDetail.transactionDate = this.formatShortDate(journalDetail.transactionDate);

                        this.journalDetailList.push(journalDetail);

                    })

                });

                this.renderTable(journalData,this.journalDetailList);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get retrieve journal');

            });
        },

        renderTable(responseData, journalDetailList) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "journalId", headerText: 'journalId', visible: false, width: 15 },
                    { type: "checkbox", width: 35 },
                    { field: "batchNumber", headerText: "Batch No.", width: 65 },
                    { field: "batchDate", headerText: "Batch Date",  width: 75 },
                    { field: "totalDebit", headerText: "Total Debit", format: "{0:n2}", width: 65 },
                    { field: "totalCredit", headerText: "Total Credit", format: "{0:n2}", width: 65 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],

                childGrid: {
                    dataSource: journalDetailList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search, ] },
                    queryString: "journalId",
                    summaryRows: [

                        {
                            title: "Total", summaryColumns: [
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "debitAmount", dataMember: "debitAmount", format: "{0:n2}" },
                                { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "creditAmount", dataMember: "creditAmount", format: "{0:n2}" },
                            ]
                        },

                    ],
                    columns: [

                        { field: "id", headerText: "Id", width: 15, visible: false, isPrimaryKey: true, },
                        { field: "journalId", headerText: "Id", width: 15, visible: false, },
                        { field: "referenceNumber", headerText: "Reference No.", validationRules: { required: true, }, width: 50, },
                        { field: "accountName", headerText: 'Account Name', textAlign: ej.TextAlign.Left, width: 105, },
                        { field: "description", headerText: "Description", validationRules: { required: true, }, width: 145, },
                        { field: "debitAmount", headerText: 'Debit Amt', textAlign: ej.TextAlign.Left, width: 50, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "creditAmount", headerText: 'Credit Amt', textAlign: ej.TextAlign.Left, width: 50, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "ouName", headerText: 'Organizational Unit',  textAlign: ej.TextAlign.Left, width: 95,  },
                        { field: "transactionDate", headerText: "Date", width: 50, format: "{0:dd-MMM-yyyy}", defaultValue: new Date(), validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                        { field: "chequeNo", headerText: "Cheque No.", width: 40, },
                        { field: "transactionSource", headerText: "Source", width: 35, },
                        { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                    ],

                },
            });

        },

        delJournal(){

            let payload = {};

            this.initializeBatchData();

            if (!this.selectedJournalEntries.length)
            {
                this.toastHandler('warning', 'No transactions have been selected for deletion !');
                return;
            }

            this.isDeleteBtnLoading = true;

            payload.ids = this.selectedJournalEntries.map(x => x.id);

            axios.post('/LedgerDataEntry/DelJournalEntries', payload).then(response => {

                this.isDeleteBtnLoading = false;

                this.toastHandler('', 'Journal entries deleted successfully.');

                this.getData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete journal entries');

                this.isDeleteBtnLoading = false;

            });

        },

        postJournal(){

            let payload = {};

            this.initializeBatchData();

            if (!this.selectedJournalEntries.length)
            {
                this.toastHandler('warning', 'No transactions have been selected for posting !');
                return;
            }

            this.isPostBtnLoading = true;

            payload.ids = this.selectedJournalEntries.map(x => x.id);

            axios.post('/LedgerDataEntry/PostJournalEntries', payload ).then(response => {

                this.isPostBtnLoading = false;

                this.toastHandler('', 'Journal entries posted successfully.');
                this.getData();

            }).catch(err => {

                this.toastHandler('error', 'Unable to post journal entries');

                this.isPostBtnLoading = false;

            });

        },

        initializeBatchData(){

            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedJournalEntries = [];
            let check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.selectedJournalEntries = rec;

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
        formatShortDate(dateInput) {

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

    created() {

        this.getData();

    },
});