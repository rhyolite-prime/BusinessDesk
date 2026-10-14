Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

let vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        journalEntryList: [],
        accountsList: [],
        ouList: [],
        id: 1,
        totalCredit: 0,
        totalDebit: 0,
        costCenterNameList: [],
        costCenterHierachyList: [],
        costCenterList: [],
        ouId: '',
        currentOuId: '',
        batchDate: moment().format("DD-MMM-YYYY"),
        batchNumber: '',
        enforceOu: false

    },

    watch: {

        ouId(newOuId) {
            this.journalEntryList = this.journalEntryList.map(line => ({
                ...line,
                ouId: newOuId
            }));
            this.currentOuId = newOuId;
            this.renderTable(this.journalEntryList, this.accountsList, this.costCenterHierachyList);
        },

    },
    validations() {
        return {
            batchDate: {
                required
            },
             
        }

    },

    methods: {

        getData() {

            axios.get('/LedgerDataEntry/InitJournalEntry').then(response => {

                response.data.accounts.forEach((v) => {

                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;

                });

                this.accountsList = response.data.accounts;

                this.costCenterHierachyList = this.parseCostCenterHierachy(response.data.costCenters);

                $("#ouId").ejDropDownList( {
                    dataSource: this.costCenterHierachyList,
                    watermarkText: "Select OU",
                    width: "100%",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.ouId = args.value;
                        let gridObj = $("#dataTable").data("ejGrid");
                        if (gridObj) {
                            let ouCol = gridObj.model.columns.find(col => col.field === "ouId");
                            if (ouCol) {
                                ouCol.defaultValue = this.ouId;
                            }
                        }
                    }

                });

                $("#batchDate").ejDatePicker( {
                    width: "100%",
                    dateFormat: "dd-MMM-yyyy",
                    value: new Date(),
                    change: (args) => {

                        this.batchDate = args.value;
                    }
                } );

                if(response.data.journalBatchSequence){

                    this.batchNumber = `${response.data.journalBatchSequence.prefix}${response.data.journalBatchSequence.nextBatchNumber}${response.data.journalBatchSequence.suffix}`;
                }

                this.enforceOu = response.data.enforceOu;

                this.renderTable([], response.data.accounts, this.costCenterHierachyList);

            }).catch(err => {

                this.toastHandler('error', 'Unable to initialize journal');

            });
        },

        renderTable(journalList, accounts, costCenters) {

            let currentDescription = "";
            let currentCheque = "";
            let ouId = this.ouId || this.currentOuId;
            
            let currentRefNo = "";

            $("#dataTable").ejGrid({

                dataSource: journalList,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                toolbarClick: (args) => {
                    // Trigger when user clicks the grid add (+) button
                    if (args.itemName === "Add") {
                        let gridObj = $("#dataTable").data("ejGrid");
                        // Get OU from the last existing row
                        if (this.journalEntryList.length > 0) {
                            let lastRow = this.journalEntryList[this.journalEntryList.length - 1];
                            let ouCol = gridObj.model.columns.find(col => col.field === "ouId");
                            if (ouCol) {
                                ouCol.defaultValue = lastRow.ouId;
                            }
                        }
                    }
                },
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
                    { field: "referenceNumber", headerText: "Reference No.", validationRules: { required: true, }, width: 55, defaultValue: currentRefNo, },
                    { field: "accountId", headerText: 'Account Name', editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "accountIdentifier", textAlign: ej.TextAlign.Left, width: 75, dataSource: accounts },
                    {
                        field: "description",
                        headerText: "Description",
                        validationRules: { required: true, },
                        width: 60,
                        defaultValue: currentDescription,
                    },
                    { field: "debitAmount", headerText: 'Debit Amount', textAlign: ej.TextAlign.Left, width: 62, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                    { field: "creditAmount", headerText: 'Credit Amount', textAlign: ej.TextAlign.Left, width: 62, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                    {
                        field: "ouId",
                        headerText: 'Organizational Unit',
                        editType: ej.Grid.EditingType.Dropdown,
                        foreignKeyField: "id",
                        foreignKeyValue: "name",
                        textAlign: ej.TextAlign.Left,
                        width: 95,
                        edit: {
                            params: {
                                value: this.currentOuId || this.ouId, //default value variable
                                dataSource: costCenters
                            }
                        },
                        dataSource: costCenters
                    },
                    { field: "transactionDate", headerText: "Transaction Date", width: 64, format: "{0:dd-MMM-yyyy}", defaultValue: new Date(), validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                    {
                        field: "chequeNo",
                        headerText: "Cheque No.",
                        width: 45,
                        defaultValue: currentCheque,
                    },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endAdd: (args) => {

                    args.data.id = this.id;

                    // Set description from previous row if available
                    currentDescription = args.data.description;
                    currentCheque = args.data.chequeNo;
                    currentRefNo = args.data.referenceNumber;
                    
                    this.journalEntryList.push(args.data);

                    this.id++;

                    this.totalCredit = 0;
                    this.totalDebit = 0;

                    // Update the defaultValue for the next row
                    let gridObj = $("#dataTable").data("ejGrid");
                    let descCol = gridObj.model.columns.find(col => col.field === "description");
                    let chequeCol = gridObj.model.columns.find(col => col.field === "chequeNo");
                    // let ouCol = gridObj.model.columns.find(col => col.field === "ouId");
                    // if (ouCol) ouCol.defaultValue = this.ouId;
                    if (descCol) {
                        descCol.defaultValue = currentDescription;
                    }

                    if (chequeCol) {
                        chequeCol.defaultValue = currentCheque;
                    }

                    //calculate debit and credit amounts
                    for (let i = 0; i < this.journalEntryList.length; i++) {
                        this.totalCredit += this.journalEntryList[i].creditAmount;
                        this.totalDebit += this.journalEntryList[i].debitAmount;
                    }

                    // Determine which side has the deficit

                    let creditDeficit = this.totalDebit - this.totalCredit;
                    let debitDeficit = this.totalCredit - this.totalDebit;

                    let creditCol = gridObj.model.columns.find(col => col.field === "creditAmount");
                    let debitCol = gridObj.model.columns.find(col => col.field === "debitAmount");

                    console.log('Credit Deficit:', creditDeficit);
                    console.log('Debit Deficit:', debitDeficit);

                    if (creditDeficit > 0.01) {
                        if (creditCol) creditCol.defaultValue = creditDeficit;
                        if (debitCol) debitCol.defaultValue = 0;
                    } else if (debitDeficit > 0.01) {
                        if (debitCol) debitCol.defaultValue = debitDeficit;
                        if (creditCol) creditCol.defaultValue = 0;
                    } else {
                        if (creditCol) creditCol.defaultValue = 0;
                        if (debitCol) debitCol.defaultValue = 0;
                    }

                },

                endDelete: ( args ) =>
                {
                    this.delJournalDetail( args.data );
                },
                endEdit: (args) => {

                    this.editJournalDetail( args.data );

                },

            });

        },

        saveJournal() {

            this.$v.$touch();

            if (this.$v.$invalid) {
                for (let key in Object.keys(this.$v)) {
                    const input = Object.keys(this.$v)[key];
                    if (this.$v[input].$error) {
                        this.$refs[input].focus();
                        break;
                    }
                }
                return;
            }
            
            if (!this.journalEntryList.length) {
                this.toastHandler('error', 'Unable to submit journal entry');
                this.toastHandler('warning', 'It appears that you have not included any transactions in your journal entry');
                return;
            }

            // Check if there are both debit and credit entries
            const hasDebitEntries = this.journalEntryList.some(entry => entry.debitAmount > 0);
            const hasCreditEntries = this.journalEntryList.some(entry => entry.creditAmount > 0);

            if (!hasDebitEntries || !hasCreditEntries) {
                this.toastHandler('error', 'Unable to submit journal entry');
                this.toastHandler('warning', 'A journal entry must have both debit and credit transactions');
                return;
            }

            // Check if debits and credits balance
            if (Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
                this.toastHandler('error', 'Unable to submit journal entry');
                this.toastHandler('warning', 'Total debits must equal total credits. Current difference: ' + Math.abs(this.totalDebit - this.totalCredit).toFixed(2));
                return;
            }

            for (let i = 0; i < this.journalEntryList.length; i++) {
                let transaction = this.journalEntryList[i];

                if (!transaction.accountId) {
                    this.toastHandler('error', 'Unable to submit journal entry');
                    this.toastHandler('warning', 'Ledger account is required for every transaction');
                    return;
                }

                if (this.enforceOu && !transaction.ouId) {
                    this.toastHandler('error', 'Unable to submit journal entry');
                    this.toastHandler('warning', 'Organizational unit is required for every transaction');
                    return;
                }

                if (!transaction.ouId) {
                    this.journalEntryList[i].ouId = '00000000-0000-0000-0000-000000000000';
                }

                let accountInfo = this.accountsList.find(x => x.id === transaction.accountId);
                let ouInfo = this.costCenterHierachyList.find(x => x.id === this.journalEntryList[i].ouId);

                this.journalEntryList[i].accountName = !accountInfo ? '' : `${accountInfo.accountNo} - ${accountInfo.accountName}`;
                this.journalEntryList[i].ouName = !ouInfo ? '' : ouInfo.name;
                this.journalEntryList[i].id = this.uuid();
                this.journalEntryList[i].transactionSource = 'GL';
            }

            this.isLoading = true;

            let payload = {};
            payload.batchNumber = !this.batchNumber ? Math.floor(Math.random() * 1000) : this.batchNumber;
            payload.batchDate = this.batchDate;
            payload.totalCredit = this.totalCredit;
            payload.totalDebit = this.totalDebit;
            payload.journalDetails = this.journalEntryList;

            axios.post('/LedgerDataEntry/CreateJournal', payload).then(response => {
                this.journalEntryList = [];
                this.renderTable([], this.accountsList, this.costCenterHierachyList);
                this.toastHandler('', 'Journal saved.');
                this.isLoading = false;
            }).catch(err => {
                this.isLoading = false;
                this.toastHandler('error', 'Unable to save journal.');
            });
        },

        delJournalDetail(journal){

            this.totalCredit = 0;
            this.totalDebit = 0;

            let transactionIndex = this.journalEntryList.findIndex(x=> x.id === journal.id );

            //remove the object from the detail array...
            if (transactionIndex !== -1 )
            {
                this.journalEntryList.splice( transactionIndex, 1 );
            }


            //set table to altered data. 
            this.renderTable(this.journalEntryList, this.accountsList, this.costCenterHierachyList);


            //calculate debit and credit amounts
            for ( let i = 0; i < this.journalEntryList.length; i++ )
            {
                this.totalCredit += this.journalEntryList[i].creditAmount;
                this.totalDebit += this.journalEntryList[i].debitAmount;
            }
        },

        editJournalDetail(journal){

            const transactionIndex = this.journalEntryList.findIndex(
                x => x.id === journal.id
            );

            // Update existing transaction
            if (transactionIndex !== -1) {

                // Preserve Vue reactivity
                this.$set(this.journalEntryList, transactionIndex, {
                    ...this.journalEntryList[transactionIndex],
                    ...journal
                });
            }

            // Recalculate totals
            this.totalDebit = this.journalEntryList.reduce(
                (sum, item) => sum + (Number(item.debitAmount) || 0),
                0
            );

            this.totalCredit = this.journalEntryList.reduce(
                (sum, item) => sum + (Number(item.creditAmount) || 0),
                0
            );

            //set table to altered data.
            this.renderTable(this.journalEntryList, this.accountsList, this.costCenterHierachyList);

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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