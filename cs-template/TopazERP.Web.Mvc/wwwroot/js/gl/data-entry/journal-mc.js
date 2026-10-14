Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

let vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        journalEntryList: [],
        accountsList: [],
        currencyRateList: [],
        ouList: [],
        id: 1,
        costCenterNameList: [],
        costCenterHierachyList: [],
        costCenterList: [],
        ouId: '',
        batchDate: moment().format("DD-MMM-YYYY"),
        batchNumber: '',
        enforceOu: false,
    },
    validations() {
        return {
            batchDate: {
                required
            },
             
        }

    },

    computed: {

        totalLocalDebit() {
            return this.journalEntryList.reduce((sum, line) => sum + (parseFloat(line.localDebit) || 0), 0);
        },

        totalLocalCredit() {
            return this.journalEntryList.reduce((sum, line) => sum + (parseFloat(line.localCredit) || 0), 0);
        },

        totalForeignDebit() {
            return this.journalEntryList.reduce((sum, line) => sum + (parseFloat(line.foreignDebit) || 0), 0);
        },

        totalForeignCredit() {
            return this.journalEntryList.reduce((sum, line) => sum + (parseFloat(line.foreignCredit) || 0), 0);
        },

    },

watch: {

        ouId(newOuId) {
            this.journalEntryList = this.journalEntryList.map(line => ({
                ...line,
                ouId: newOuId
            }));
        },

        journalEntryList: {
            deep: true,
            handler(lines) {
                lines.forEach((line, index) => {

                    const buyRate = parseFloat(line.buyRate);

                    // Skip if no valid buy rate
                    if (!buyRate || buyRate <= 0) return;

                    // Check if currency is default or not
                    const currency = this.currencyRateList.find(c => c.id === line.currencyId);
                    const isDefault = currency ? currency.isDefault : false;

                    if (isDefault) {
                        // For default currency (local currency): Only local fields are used, no conversion needed
                        // Do not compute foreign debit and credit values
                        return;
                    } else {
                        // For non-default currency: Foreign fields are editable, calculate local from foreign
                        const foreignCredit = parseFloat(line.foreignCredit);
                        if (!isNaN(foreignCredit) && foreignCredit >= 0) {
                            const computedLocalCredit = parseFloat((foreignCredit * buyRate).toFixed(4));
                            // Guard prevents infinite loop: only write when value actually changed
                            if (parseFloat(line.localCredit) !== computedLocalCredit) {
                                this.$set(this.journalEntryList[index], 'localCredit', computedLocalCredit);
                            }
                        }

                        // Handle foreignDebit -> localDebit conversion
                        const foreignDebit = parseFloat(line.foreignDebit);
                        if (!isNaN(foreignDebit) && foreignDebit >= 0) {
                            const computedLocalDebit = parseFloat((foreignDebit * buyRate).toFixed(4));
                            // Guard prevents infinite loop: only write when value actually changed
                            if (parseFloat(line.localDebit) !== computedLocalDebit) {
                                this.$set(this.journalEntryList[index], 'localDebit', computedLocalDebit);
                            }
                        }
                    }

                });
            }
        },

    },

    methods: {

        // Method to check if a currency is default for a specific journal line
        isCurrencyDefault(index) {
            const line = this.journalEntryList[index];
            if (!line || !line.currencyId) return false;

            const currency = this.currencyRateList.find(c => c.id === line.currencyId);
            return currency ? currency.isDefault : false;
        },

        // Method to determine if local fields should be enabled
        isLocalFieldEnabled(index) {
            return this.isCurrencyDefault(index);
        },

        // Method to determine if foreign fields should be enabled
        isForeignFieldEnabled(index) {
            return !this.isCurrencyDefault(index);
        },

        getData() {

            axios.get('/LedgerDataEntry/InitJournalEntryMc').then(response => {

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


            }).catch(err => {

                console.log(err);
                this.toastHandler('error', 'Unable to initialize journal');

            });
        },

        getCurrencies() {

            axios.get('/SharedResource/GetCurrencys').then(response => {

                this.currencyRateList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get currency.');

            });
        },

        onAccountChange(accountId, rowIndex) {
            const currentLine = this.journalEntryList[rowIndex] || {};

            if (!accountId) {
                // Account cleared -> clear currency + amounts (keep existing behavior)
                this.$set(this.journalEntryList, rowIndex, {
                    ...currentLine,
                    currencyId: '',
                    currencyName: '',
                    currencyRate: '',
                    buyRate: null,
                    sellRate: null,
                    localDebit: 0,
                    localCredit: 0,
                    foreignDebit: 0,
                    foreignCredit: 0
                });
                return;
            }

            // 1) Find selected GL account
            const account = this.accountsList.find(a => a.id === accountId);
            if (!account || !account.currencyId) {
                // If account doesn't have a currencyId, just clear the currency fields (do not touch amounts)
                this.$set(this.journalEntryList, rowIndex, {
                    ...currentLine,
                    currencyId: '',
                    currencyName: '',
                    currencyRate: '',
                    buyRate: null,
                    sellRate: null
                });
                return;
            }

            // 2) Find currency details using currencyId from the account
            const currency = this.currencyRateList.find(c => c.id === account.currencyId);
            if (!currency) return;

            const isDefault = !!currency.isDefault;

            // Preserve amounts depending on whether account is local (default currency) or foreign
            const hasLocalAmounts =
                (parseFloat(currentLine.localDebit) || 0) > 0 || (parseFloat(currentLine.localCredit) || 0) > 0;
            const hasForeignAmounts =
                (parseFloat(currentLine.foreignDebit) || 0) > 0 || (parseFloat(currentLine.foreignCredit) || 0) > 0;

            this.$set(this.journalEntryList, rowIndex, {
                ...currentLine,
                currencyId: account.currencyId,
                currencyName: currency.currencyName,
                currencyRate: currency.buyRate,
                buyRate: currency.buyRate ?? null,
                sellRate: currency.sellRate ?? null,

                // (1) If LOCAL account: do NOT zero local debit/credit if already > 0
                localDebit: isDefault
                    ? (hasLocalAmounts ? currentLine.localDebit : 0)
                    : 0,
                localCredit: isDefault
                    ? (hasLocalAmounts ? currentLine.localCredit : 0)
                    : 0,

                // (2) If FOREIGN account: do NOT zero foreign debit/credit if already > 0
                foreignDebit: !isDefault
                    ? (hasForeignAmounts ? currentLine.foreignDebit : 0)
                    : 0,
                foreignCredit: !isDefault
                    ? (hasForeignAmounts ? currentLine.foreignCredit : 0)
                    : 0
            });
        },

        onCurrencyChange(currencyId, rowIndex) {

            const line = this.journalEntryList[rowIndex];
            if (!line) return;

            if (!currencyId) {
                // Currency cleared — reset rates and clear amounts based on previous state
                this.$set(this.journalEntryList, rowIndex, {
                    ...line,
                    buyRate: null,
                    sellRate: null,
                    localDebit: 0,
                    localCredit: 0,
                    foreignDebit: 0,
                    foreignCredit: 0
                });
                return;
            }

            const currency = this.currencyRateList.find(c => c.id === currencyId);
            if (!currency) return;

            // Clear amounts when currency changes and set appropriate fields based on isDefault
            const updatedLine = {
                ...line,
                buyRate: currency.buyRate ?? null,
                sellRate: currency.sellRate ?? null,
            };

            // Clear all amount fields when currency changes
            updatedLine.localDebit = 0;
            updatedLine.localCredit = 0;
            updatedLine.foreignDebit = 0;
            updatedLine.foreignCredit = 0;

            // Use Vue.set so the reactive system picks up the property changes
            this.$set(this.journalEntryList, rowIndex, updatedLine);
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
            const hasDebitEntries = this.journalEntryList.some(entry => entry.localDebit > 0);
            const hasCreditEntries = this.journalEntryList.some(entry => entry.localCredit > 0);

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

            for (let i = 0; i < this.journalEntryList.length; i++)
            {
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

                // When OU enforcement is disabled, assign an empty GUID so the API can handle validation.
                if (!this.enforceOu && !transaction.ouId) {
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
            payload.TotalCredit  = this.totalLocalCredit;
            payload.totalDebit   = this.totalLocalDebit;
            payload.transactionSource  = "GL";

            this.journalEntryList.forEach(entry => {
                entry.debitAmount = entry.localDebit;
                entry.creditAmount = entry.localCredit;
            })
            payload.journalDetails = this.journalEntryList;

            console.log(payload);

            axios.post('/LedgerDataEntry/CreateJournal', payload).then(response => {
                this.journalEntryList = [];

                this.toastHandler('', 'Journal saved.');
                this.isLoading = false;
            }).catch(err => {
                this.isLoading = false;
                this.toastHandler('error', 'Unable to save journal.');
            });
        },

        removeLine(index) {
            // Ensure at least one journal line always exists
            if (this.journalEntryList.length > 1) {
                this.journalEntryList.splice(index, 1);
            }
        },

        addLine() {
            // Repeat header-like fields from the first row (if it exists)
            const firstLine = this.journalEntryList && this.journalEntryList.length > 0
                ? this.journalEntryList[0]
                : null;

            // Use ONLY local totals to determine the opposite amount needed to balance
            const totalLocalDebit = this.journalEntryList.reduce((sum, l) => sum + (parseFloat(l.localDebit) || 0), 0);
            const totalLocalCredit = this.journalEntryList.reduce((sum, l) => sum + (parseFloat(l.localCredit) || 0), 0);

            // Net: + means debit-heavy (need credit), - means credit-heavy (need debit)
            const netLocal = +(totalLocalDebit - totalLocalCredit);

            const newLine = {
                referenceNumber: firstLine ? (firstLine.referenceNumber || '') : '',
                accountId: '',
                ouId: firstLine ? (firstLine.ouId || '') : this.ouId,
                currencyId: '',
                buyRate: null,
                sellRate: null,
                description: firstLine ? (firstLine.description || '') : '',
                localDebit: 0,
                localCredit: 0,
                foreignDebit: 0,
                foreignCredit: 0,
                recipient: '',
                chequeNo: ''
            };

            // Set the opposite amount on the local side to balance the journal so far
            if (netLocal > 0) newLine.localCredit = Math.abs(netLocal);
            if (netLocal < 0) newLine.localDebit = Math.abs(netLocal);

            this.journalEntryList.push(newLine);
        },

        removeLastLine() {
            if (this.journalEntryList.length > 1) {
                this.journalEntryList.pop();
            }
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

        formatCurrency(value) {
            if (!value && value !== 0) return '0.00';
            return parseFloat(value).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
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

        this.getData();
        this.getCurrencies();
    },
});