Vue.use(window.vuelidate.default);
const { required } = window.validators;

let vue = new Vue({
    el: '#app',
    data: {
        isLoading: false,
        isShimmerLoading: true,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        accountsList: [],
        currencyList: [],
        costCenterHierachyList: [],
        pettyCashList: [],
        pettyCashAccountId: '',
        currencyId: '',
        currencyRate: null,
        batchDate: moment().format("YYYY-MM-DD"),
        batchNo: '',
        sourceDocNo: '',
        batchOriginator: '',
        totalAmount: 0.00,
        transactionId: '',
        isEditMode: false,
        isRecordCreated: false,
        voucherBatchSystemNumber: {},
        proposedJournalHeaderId: '',
        proposedJournalDetailIdList: [],
        journalEntryList: []
    },
    validations() {
        return {
            pettyCashAccountId: { required },
            batchDate: { required },
            currencyId: { required }
        }
    },
    computed: {
        saveButtonText() {
            if (this.isEditMode) return 'Update';
            return this.isRecordCreated ? 'Create New' : 'Save';
        }
    },
    methods: {
        initPettyCash() {
            this.isShimmerLoading = true;
            return axios.get('/LedgerDataEntry/InitPettyCashEntry').then(response => {
                response.data.accounts.forEach((v) => {
                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;
                });
                this.accountsList = response.data.accounts;
                this.costCenterHierachyList = this.parseCostCenterHierachy(response.data.costCenters);
                this.voucherBatchSystemNumber = response.data.voucherBatchSystemNumber;

                if (this.voucherBatchSystemNumber && this.voucherBatchSystemNumber.prefix) {
                    this.batchNo = `${this.voucherBatchSystemNumber.prefix}${this.voucherBatchSystemNumber.lastNo}${this.voucherBatchSystemNumber.suffix}`;
                }

                const defaultGl = response.data.defaultGlNumbers;

                if (defaultGl && defaultGl.pettyCashAccountId) {
                    this.pettyCashAccountId = defaultGl.pettyCashAccountId;
                    let accountInfo = this.accountsList.find(a => a.id === this.pettyCashAccountId);
                    if (accountInfo && accountInfo.currencyId) {
                        this.currencyId = accountInfo.currencyId;
                    }
                }
            }).catch(err => {
                console.error(err);
                this.toastHandler('error', 'Petty Cash initialization failed.');
            }).finally(() => {
                this.isShimmerLoading = false;
                const mainContent = document.getElementById('main-content');
                if (mainContent) mainContent.classList.remove('d-none');
            });
        },

        getCurrencies() {
            return axios.get('/SharedResource/GetCurrencys').then(response => {
                this.currencyList = response.data;
            }).catch(err => {
                this.toastHandler('error', 'Unable to retrieve currencies');
            });
        },

        loadPettyCashDetails() {

            this.isShimmerLoading = true;

            axios.get('/LedgerDataEntry/GetPettyCashDetails?id=' + this.transactionId).then(response => {
                const data = response.data.transactionInfo;
                this.proposedJournalHeaderId = response.data.proposedJournalHeader.id;
                this.proposedJournalDetailIdList = response.data.proposedJournalDetails.map(a => a.id);

                this.pettyCashAccountId = data.pettyCashAccountId;
                this.currencyId = data.currencyId;
                this.currencyRate = data.currencyRate;
                this.batchDate = moment(data.batchDate).format("YYYY-MM-DD");
                this.batchNo = data.batchNo;
                this.sourceDocNo = data.sourceDocNo;
                this.batchOriginator = data.batchOriginator;

                this.pettyCashList = data.details || [];
                this.pettyCashList.forEach(v => {
                    v.transactionDate = moment(v.transactionDate).format("YYYY-MM-DD");
                    if (!v.id) v.id = this.uuid();
                });

                this.reComputeTotal();
            }).catch(err => {
                this.toastHandler('error', 'Unable to load petty cash details.');
            }).finally(() => {
                this.isShimmerLoading = false;
                abp.ui.clearBusy('body');
            });
        },

        addPettyCashRow() {
            this.pettyCashList.push({
                id: this.uuid(),
                transactionDate: this.batchDate,
                refNo: '',
                expenseAccountId: '',
                description: '',
                amount: 0,
                ouId: '',
                recipientName: ''
            });
        },

        removePettyCashRow(index) {
            this.pettyCashList.splice(index, 1);
            this.reComputeTotal();
        },

        reComputeTotal() {
            let total = 0;
            this.pettyCashList.forEach(item => {
                total += parseFloat(item.amount || 0);
            });
            this.totalAmount = total.toFixed(2);
        },

        rebuildJournalEntryList() {
            let journalLines = [];
            const currencyInfo = this.currencyList.find(x => x.id === this.currencyId);
            const pettyCashAccountInfo = this.accountsList.find(x => x.id === this.pettyCashAccountId);

            const firstOuId = this.pettyCashList.length ? this.pettyCashList[0].ouId : null;

            // Debit lines (for each expense)
            this.pettyCashList.forEach(v => {
                const expenseAccountInfo = this.accountsList.find(x => x.id === v.expenseAccountId);
                const ouInfo = this.costCenterHierachyList.find(x => x.id === v.ouId);
                const amount = parseFloat(v.amount || 0);

                if (amount > 0) {
                    journalLines.push({
                        id: this.uuid(),
                        accountId: v.expenseAccountId,
                        accountName: !expenseAccountInfo ? '' : expenseAccountInfo.accountIdentifier,
                        ouId: v.ouId || this.emptyGuid,
                        ouName: !ouInfo ? '' : ouInfo.name,
                        transactionDate: v.transactionDate || this.batchDate,
                        transactionSource: 'gl',
                        currencyId: this.currencyId,
                        currencyName: !currencyInfo ? '' : currencyInfo.currencyName,
                        currencyCode: !currencyInfo ? '' : currencyInfo.currencyCode,
                        buyRate: !currencyInfo ? 1 : currencyInfo.buyRate,
                        sellRate: !currencyInfo ? 1 : currencyInfo.sellRate,
                        pettyCashReceipientId: this.emptyGuid,
                        pettyCashReceipientName: v.recipientName || '',
                        referenceNumber: v.refNo || this.batchNo,
                        description: v.description || 'Petty Cash Expense',
                        debitAmount: amount,
                        creditAmount: 0
                    });
                }
            });

            // Credit line (total from petty cash G/L)
            const netAmount = parseFloat(this.totalAmount || 0);
            if (netAmount > 0 && this.pettyCashAccountId) {
                const defaultOuInfo = this.costCenterHierachyList.find(x => x.id === firstOuId);
                journalLines.push({
                    id: this.uuid(),
                    accountId: this.pettyCashAccountId,
                    accountName: !pettyCashAccountInfo ? '' : pettyCashAccountInfo.accountIdentifier,
                    ouId: firstOuId || this.emptyGuid,
                    ouName: !defaultOuInfo ? '' : defaultOuInfo.name,
                    transactionDate: this.batchDate,
                    transactionSource: 'gl',
                    currencyId: this.currencyId,
                    currencyName: !currencyInfo ? '' : currencyInfo.currencyName,
                    currencyCode: !currencyInfo ? '' : currencyInfo.currencyCode,
                    buyRate: !currencyInfo ? 1 : currencyInfo.buyRate,
                    sellRate: !currencyInfo ? 1 : currencyInfo.sellRate,
                    pettyCashReceipientId: this.emptyGuid,
                    referenceNumber: this.batchNo,
                    description: `Petty Cash Batch #${this.batchNo}`,
                    debitAmount: 0,
                    creditAmount: netAmount
                });
            }

            this.journalEntryList = journalLines;
        },

        savePettyCash() {
            if (this.isRecordCreated) {
                this.createNewPettyCash();
                return;
            }

            this.$v.$touch();
            if (this.$v.$invalid) {
                this.toastHandler('warning', 'Please fill all required fields correctly.');
                return;
            }

            if (!this.pettyCashList.length) {
                this.toastHandler('warning', 'Petty Cash has no transactions.');
                return;
            }

            this.isLoading = true;
            let payload = {};
            let currencyInfo = this.currencyList.find(a => a.id === this.currencyId);
            let pettyCashAccountInfo = this.accountsList.find(a => a.id === this.pettyCashAccountId);

            payload.id = this.transactionId;
            payload.batchDate = this.batchDate;
            payload.batchNo = this.batchNo;
            payload.sourceDocNo = this.sourceDocNo;
            payload.batchOriginator = this.batchOriginator;

            payload.pettyCashAccountId = this.pettyCashAccountId;
            payload.pettyCashAccountName = !pettyCashAccountInfo ? '' : pettyCashAccountInfo.accountIdentifier;

            payload.currencyId = this.currencyId;
            payload.currencyName = !currencyInfo ? '' : currencyInfo.currencyName;
            payload.currencyCode = !currencyInfo ? '' : currencyInfo.currencyCode;
            payload.currencyRate = !currencyInfo ? 1 : currencyInfo.buyRate;

            payload.totalAmount = parseFloat(this.totalAmount);

            payload.proposedJournalHeaderId = this.proposedJournalHeaderId;
            payload.proposedJournalDetailIdList = this.proposedJournalDetailIdList;

            this.pettyCashList.forEach(v => {
                let expenseAccountInfo = this.accountsList.find(a => a.id === v.expenseAccountId);
                v.expenseAccountName = expenseAccountInfo ? expenseAccountInfo.accountIdentifier : '';
                v.ouId = v.ouId || this.emptyGuid;
                let ouInfo = this.costCenterHierachyList.find(a => a.id === v.ouId);
                v.ouName = ouInfo ? ouInfo.name : '--';
                if (!v.id) v.id = this.uuid();
            });

            payload.details = this.pettyCashList;

            let saveEndpoint = this.isEditMode ? '/LedgerDataEntry/UpdatePettyCash' : '/LedgerDataEntry/CreatePettyCash';

            axios.post(saveEndpoint, payload).then((response) => {
                if (response.data && response.data.id) {
                    this.transactionId = response.data.id;
                    this.isRecordCreated = true;
                }
                this.toastHandler('success', `Petty cash ${this.isEditMode ? 'updated' : 'saved'}.`);
                this.saveJournal();
            }).catch((error) => {
                this.isLoading = false;
                this.toastHandler('error', `Unable to ${this.isEditMode ? 'update' : 'create'} petty cash.`);
            });
        },

        saveJournal() {
            this.rebuildJournalEntryList();

            let payload = {
                batchNumber: this.batchNo,
                batchDate: this.batchDate,
                isTemporary: true,
                totalCredit: this.totalAmount,
                totalDebit: this.totalAmount,
                id: this.transactionId,
                journalDetails: this.journalEntryList
            };

            axios.post('/LedgerDataEntry/CreateJournal', payload).then(response => {
                this.journalEntryList = [];
                this.isLoading = false;
            }).catch(error => {
                this.isLoading = false;
                this.toastHandler('error', 'Unable to create proposed journal entries.');
            });
        },

        postPettyCash() {
            if (!this.transactionId) {
                this.toastHandler('warning', 'Please save the petty cash before posting.');
                return;
            }
            this.isLoading = true;
            axios.post('/LedgerDataEntry/PostPettyCash', { ids: [this.transactionId] }).then(response => {
                this.toastHandler('success', 'Petty Cash posted successfully.');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }).catch(err => {
                this.isLoading = false;
                this.toastHandler('error', 'Unable to post petty cash.');
            });
        },

        createNewPettyCash() {
            window.location.reload();
        },

        toastHandler(type, message) {
            toastr[type || 'success'](message);
        },

        uuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
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

    },
    mounted() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');

        if (id) {
            this.transactionId = id;
            this.isEditMode = true;
        }

        Promise.all([this.getCurrencies(), this.initPettyCash()]).then(() => {
            if (this.isEditMode) {
                this.loadPettyCashDetails();
            } else {
                this.addPettyCashRow();
            }
        });
    }
});