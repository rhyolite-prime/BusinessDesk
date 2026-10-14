
let vue = new Vue({
    el: '#app',
    data: {

        isClosingPeriod: false,
        isGettingDetails: false,
        journalList: [],
        journalDetailList: [],
        month: 1,
        year: new Date().getFullYear(),
        accountingPeriod: {},
        
    },

    methods: {

        getDetails() {

            this.isGettingDetails = true;
            
            axios.get(`/LedgerDataEntry/GetJournalTransactionsByPeriod?month=${this.month}&year=${this.year}`).then(response => {

                this.journalList = [];
                this.journalDetailList = [];
                
                response.data.forEach((v) => {

                    v.journal.journalId = v.journal.id;
                    v.journal.orgUnit = v.journalDetails[0].ouName;
                    v.journal.batchDate = this.formatShortDate(v.journal.batchDate);

                    this.journalList.push(v.journal);

                    v.journalDetails.forEach((journalDetail) => {

                        journalDetail.transactionDate = this.formatShortDate(journalDetail.transactionDate);
                        
                        this.journalDetailList.push(journalDetail);
                    })

                });

                this.isGettingDetails = false;
 
                this.renderTable(this.journalList, this.journalDetailList);

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve journal transactions');
                this.isGettingDetails = false;

            });
            
        },

        closePeriod(){

            this.isClosingPeriod = true;
            
            axios.get(`/LedgerDataEntry/CloseAccountingPeriod?month=${this.month}&year=${this.year}`).then(response => {

                this.isClosingPeriod = false;

                this.toastHandler('', 'Accounting Period Closed');

            }).catch(err => {

                this.toastHandler('error', 'Unable to close accounting period.');

                this.isClosingPeriod = false;

            });
            
        },

        getLastClosedDate(){

            axios.get('/LedgerDataEntry/GetLastClosedPeriod/').then(response => {

               this.accountingPeriod = response.data;
               
               console.log(this.accountingPeriod);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get last closed period.');

            });
            
        },

        renderTable(responseData, journalDetailList) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "journalId", headerText: 'journalId', visible: false, width: 15 },
                    { type: "checkbox", width: 35 },
                    { field: "orgUnit", headerText: "Organizational Unit",  width: 100 },
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
                        { field: "accountName", headerText: 'Account Name', textAlign: ej.TextAlign.Left, width: 75, },
                        { field: "description", headerText: "Description", validationRules: { required: true, }, width: 100, },
                        { field: "debitAmount", headerText: 'Debit Amt', textAlign: ej.TextAlign.Left, width: 45, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "creditAmount", headerText: 'Credit Amt', textAlign: ej.TextAlign.Left, width: 45, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: false, } },
                        { field: "ouName", headerText: 'Organizational Unit',  textAlign: ej.TextAlign.Left, width: 95,  },
                        { field: "transactionDate", headerText: "Date", width: 45, format: "{0:dd-MMM-yyyy}", defaultValue: new Date(), validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                        { field: "currencyName", headerText: "Currency", width: 45, },
                        { field: "transactionSource", headerText: "Source", width: 35, },
                        { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                    ],

                },
            });

        },


        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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

        this.getLastClosedDate();

    },
});