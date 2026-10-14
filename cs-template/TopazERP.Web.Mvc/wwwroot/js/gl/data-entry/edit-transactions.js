
let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        journalDetailList: [],
        selectedJournalEntries: [],
        isPostBtnLoading: false,
        isDeleteBtnLoading: false,
        accountsList: [],
        costCenterHierachyList: [],
        costCenterNameList: [],
        costCenterList: [],
    },

    methods: {

        getData() {

            axios.get('/LedgerDataEntry/GetUnpostedJournalEntries').then(response => {

                response.data.journalData.forEach((journalHeader) => {

                    journalHeader.batchDate = this.formatShortDate(journalHeader.batchDate);

                    journalHeader.journalDetails.forEach((journalDetail) => {

                        journalDetail.transactionDate = this.formatShortDate(journalDetail.transactionDate);

                        this.journalDetailList.push(journalDetail);

                    })

                });

                response.data.accounts.forEach((v) => {

                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;

                });

                this.accountsList = response.data.accounts;

                this.costCenterHierachyList = this.parseCostCenterHierachy(response.data.costCenters);

                this.renderTable(response.data.journalData,this.journalDetailList, response.data.accounts, this.costCenterHierachyList);

            }).catch(err => {

                console.log(err);
                this.toastHandler('error', 'Unable to get retrieve journal');

            });
        },

        renderTable(responseData, journalDetailList, accounts, costCenters) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "journalId", headerText: 'journalId', visible: false, width: 15 },
                    { field: "batchNumber", headerText: "Batch No.", width: 65 },
                    { field: "batchDate", headerText: "Batch Date",  width: 75 },
                    { field: "totalDebit", headerText: "Total Debit", format: "{0:n2}", width: 65 },
                    { field: "totalCredit", headerText: "Total Credit", format: "{0:n2}", width: 65 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],
                endDelete: ( args ) =>
                {
                    this.delJournal( args.data.id );
                },
                childGrid: {
                    dataSource: journalDetailList,
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search, ] },
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

                        { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                        { field: "journalId", headerText: "JournalId", width: 75, visible: false, },
                        { field: "referenceNumber", headerText: "Reference No.", validationRules: { required: true, }, width: 55, },
                        { field: "accountId", headerText: 'Account Name', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "accountIdentifier", textAlign: ej.TextAlign.Left, width: 75, dataSource: accounts },
                        { field: "description", headerText: "Description", validationRules: { required: true, }, width: 60, },
                        { field: "debitAmount", headerText: 'Debit Amount', textAlign: ej.TextAlign.Left, width: 62, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "creditAmount", headerText: 'Credit Amount', textAlign: ej.TextAlign.Left, width: 62, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "ouId", headerText: 'Organizational Unit', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left, width: 95, dataSource: costCenters },
                        { field: "transactionDate", headerText: "Transaction Date", width: 64, format: "{0:dd-MMM-yyyy}", allowEditing :false, textAlign: ej.TextAlign.Left },
                        { field: "chequeNo", headerText: "Cheque No.", width: 45, },
                        { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                    ],
                    endEdit: (args) => {

                        this.editJournalDetail(args.data);
                    },

                },
            });

        },

        delJournal(id){

            let payload = {}
            payload.ids = [id];

            axios.post('/LedgerDataEntry/DelJournalEntries', payload).then(response => {

                this.getData();

                this.toastHandler('', 'Journal deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete journal.');

            });
        },

        editJournalDetail(payload){

            let ouInfo = this.costCenterHierachyList.find(x=> x.id === payload.ouId);

            let accountInfo = this.accountsList.find(x=> x.id === payload.accountId);

            payload.ouName = !ouInfo ? '' : ouInfo.name;

            payload.accountName = !accountInfo ? '' : accountInfo.accountIdentifier;

            axios.post('/LedgerDataEntry/UpdateJournalDetails', payload).then(response => {

                this.toastHandler('', 'Journal updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update journal.');

            });
        },

        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },

        parseCostCenterHierachy(dataArr) {

            this.costCenterList = dataArr;

            let costCenterHierachyList = [];

            for (let i = 0; i < this.costCenterList.length; i++) {

                this.getHierachyName(this.costCenterList[i].id);

                let name = [...new Set(this.costCenterNameList)].join().replace(/,/g, '/');

                costCenterHierachyList.push({
                    name: name,
                    parentId: this.costCenterList[i].parentId,
                    id: this.costCenterList[i].id,
                    rawName: this.costCenterList[i].name,
                    tenantId: this.costCenterList[i].tenantId,
                });

                name = [];

                this.costCenterNameList = [];

            }

            return costCenterHierachyList;

        },

        getHierachyName(id) {

            let parentId;
            let returnName;

            this.costCenterList.forEach(item => {

                if (item.id === id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }

                this.costCenterList.forEach(cc => {
                    if (cc.id === parentId) {
                        return (`${this.getHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.costCenterNameList.push(returnName);

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