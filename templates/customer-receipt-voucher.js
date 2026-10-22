Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

let vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        customerList: [],
        accountsList: [],
        bankList: [],
        currencyList: [],
        payload: {},
        taxType: '',
        transactionId: 1,
        hasGetFundLevy: false,
        hasCommunicationServiceTax: false,
        communicationServiceTaxRate: 0.00,
        getFundLevyRate: 0.00,
        paymentList: [],
        journalEntryList: [],
        costCenterNameList: [],
        costCenterHierachyList: [],
        costCenterList: [],
        voucherList: [],
        voucherEntryDate: '',
        totalRetentionCredit: 0.00,
        totalCredit: 0.00,
        totalDebit: 0.00,
        totalNetAmount: 0.00,
        creditAccountId: '',
        bankAccountId: '',
        chequeDate: moment().format("DD-MMM-YYYY"),
        receiptDate: moment().format("DD-MMM-YYYY"),
        batchNumber: '',
        modePayment: 'Cash',
        retentionsList: [],
        hasCovidTax: false,
        isRecordCreated: false,
        covidTaxRate: 0.00,
        withHoldingVatPercentage: 7.00,
        customerId: '',
        bankId: '',
        currencyId: '',
        voucherId: '',
        hasWithHolding: false,
        chequeNo: '',
        batchNo: '',
        isMultiCurrency: false,
        currencyRate: null,
        isEditMode: false,
        proposedJournalHeaderId: '',
        proposedJournalDetailIdList: []
    },

    validations() {

        return {

            customerId: {
                required
            },

            voucherEntryDate: {
                required
            },

            
            bankAccountId: {
                required,
            },
            currencyId: {
                required,
            },
        }

    },

    computed: {
        saveButtonText() {
            if (this.isEditMode) {
                return 'Update';
            }
            return this.isRecordCreated ? 'Create New' : 'Save';
        }
    },
    
    methods: {

        initReceiptVoucher() {

            this.isShimmerLoading = true;
            
            axios.get('/LedgerDataEntry/InitSupplierPvEntry').then(response => {

                response.data.accounts.forEach((v) => {

                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;
                });

                this.accountsList = response.data.accounts;

                this.costCenterHierachyList = this.parseCostCenterHierachy(response.data.costCenters);

                this.batchNo = `${response.data.voucherBatchSystemNumber.prefix}${response.data.voucherBatchSystemNumber.lastNo}${response.data.voucherBatchSystemNumber.suffix}`;

                const defaultBankId = response.data.defaultGlNumbers.accountsReceivableBankAccountId;
                
                this.bankAccountId = defaultBankId;

                let accountInfo = this.accountsList.find(a => a.id === defaultBankId);

                if (accountInfo && accountInfo.currencyId) {
                    this.currencyId = accountInfo.currencyId;
                }

            }).catch(err => {

                console.log(err)
                this.toastHandler('error', 'Voucher initialization failed.');

            }).finally(() => {

                this.isShimmerLoading = false;

                const mainContent = document.getElementById('main-content');
                if (mainContent) {
                    mainContent.classList.remove('d-none');
                }
            });
        },

        loadVoucherDetails() {

            this.isShimmerLoading = true;

            axios.get('/LedgerDataEntry/GetVoucherDetails?id=' + this.voucherId).then(response => {
                const data = response.data.voucherInfo;

                this.proposedJournalHeaderId = response.data.proposedJournalHeader.id;
                this.proposedJournalDetailIdList = response.data.proposedJournalDetails.map(a=> a.id);

                this.employeeId = data.employeeId;

                this.bankAccountId = data.bankAccountId;

                this.currencyId = data.currencyId;

                this.bankId = data.bankId;

                this.withHoldingAccountId = data.withHoldingAccountId;

                this.vatWithHoldingAccountId = data.vatWithHoldingAccountId;

                this.modePayment = data.modeOfPayment;

                // Set dates
                this.voucherEntryDate = moment(data.voucherEntryDate).format("YYYY-MM-DD");
                this.paymentDate = moment(data.paymentDate).format("YYYY-MM-DD");

                this.batchNo = data.batchNo;
                this.chequeNo = data.chequeNo;
                this.taxType = data.taxType;

                this.hasWithHolding = data.hasWithHolding;
                this.withHoldingRate = data.withHoldingRate;

                this.hasGetFundLevy = data.hasGetFundLevy;
                this.getFundLevyRate = data.getFundLevyRate;

                this.hasVat = data.hasVat;
                this.vatRate = data.vatRate;

                this.hasVatWithhold = data.hasVatWithhold;
                this.withHoldingVatPercentage = data.withHoldingVatPercentage;

                this.hasNationalHealthInsuranceLevy = data.hasNationalHealthInsuranceLevy;
                this.nationalHealthInsuranceLevyRate = data.nationalHealthInsuranceLevyRate;

                this.hasCommunicationServiceTax = data.hasCommunicationServiceTax;
                this.communicationServiceTaxRate = data.communicationServiceTaxRate;

                this.hasCovidTax = data.hasCovidTax;
                this.covidTaxRate = data.covidTaxRate;

                // Set details
                this.voucherList = data.details || [];
                this.voucherList.forEach(v => {
                    v.localDebitAmount = v.amount;
                    v.foreignDebitAmount = v.foreignDebitAmount || 0;
                    v.accountId = v.debitAccountId ? v.debitAccountId.toLowerCase() : '';

                    v.description = v.description || '';
                    if (!v.id) v.id = this.uuid();
                });

                this.retentionsList = data.retensions || [];
                this.retentionsList.forEach(r => {
                    r.accountId = r.accountId ? r.accountId.toLowerCase() : '';
                    r.amount = r.amount || 0;
                    r.totalAmount = r.totalAmount || 0;
                    if (!r.id) r.id = this.uuid();
                });
 

            }).catch(err => {
                this.toastHandler('error', 'Unable to load voucher details.');
            }).finally(() => {
                this.isShimmerLoading = false;
                abp.ui.clearBusy('body');
            });
        },

        getCustomers() {

            axios.get('/SharedResource/GetCustomers').then(response => {

                this.customerList = response.data;
 
            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve suppliers');

            });
        },

        getBanks() {

            axios.get('/SharedResource/GetBanks').then(response => {

                this.bankList = response.data;
 
            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve banks.');

            });
        },

        getCurrencies() {

            axios.get('/SharedResource/GetCurrencys').then(response => {

                this.currencyList = response.data;
  
            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve currencies');

            });
        },

        saveVoucher() {

            // If record is already created, handle "Create New" functionality
            if (this.isRecordCreated) {
                this.createNewVoucher();
                return;
            }

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

            if (!this.voucherList.length) {

                this.toastHandler('warning', 'Payment voucher has no transactions.');
                return;
            }

            this.isLoading = true;

            let payload = {};

            let customerInfo = this.customerList.find(a => a.id === this.customerId);
            let bankAccountInfo = this.accountsList.find(a => a.id === this.bankAccountId);
            let withHoldingAccountInfo = this.accountsList.find(a => a.id === this.withHoldingAccountId);
            let vatWithHoldingAccountInfo = this.accountsList.find(a => a.id === this.vatWithHoldingAccountId);
            let bankInfo = this.bankList.find(a => a.id === this.bankId);
            let currencyInfo = this.currencyList.find(a => a.id === this.currencyId);

            payload.supplierId = this.emptyGuid;
            payload.supplierName = '';
            payload.customerId = this.customerId;
            payload.customerName = customerInfo.name;
            payload.employeeId = this.emptyGuid;
            payload.employeeName = '';
            payload.voucherEntryDate = this.voucherEntryDate;
            payload.batchNo = this.batchNo;
            payload.chequeNo = this.chequeNo;

            payload.currencyId = this.currencyId;
            payload.currencyName = !currencyInfo ? '' : currencyInfo.currencyName;
            payload.currencyCode = !currencyInfo ? '' : currencyInfo.currencyCode;

            payload.buyRate = !currencyInfo ? '' : currencyInfo.buyRate;
            payload.sellRate = !currencyInfo ? '' : currencyInfo.sellRate;

            payload.bankAccountId = this.bankAccountId;
            payload.bankAccountName = !bankAccountInfo ? '' : bankAccountInfo.accountIdentifier;
            payload.bankId = !this.bankId ? this.emptyGuid : this.bankId;
            payload.bankName = !bankInfo ? '' : bankInfo.name;

            payload.paymentDate = this.paymentDate;
            payload.modePayment = this.modePayment;
            payload.paymentAmount = parseFloat(this.totalCredit);

            payload.bankGlAccountName = !bankAccountInfo ? '' : bankAccountInfo.accountName;
            payload.bankName = !bankInfo ? '' : bankInfo.name;

            payload.hasWithHolding = this.hasWithHolding;
            payload.withHoldingRate = 0;

            payload.withHoldingAccountId = !this.withHoldingAccountId ? this.emptyGuid : this.withHoldingAccountId;
            payload.withHoldingAccountName = !withHoldingAccountInfo ? '' : withHoldingAccountInfo.accountIdentifier;

            payload.vatWithHoldingAccountId = !this.vatWithHoldingAccountId ? this.emptyGuid : this.vatWithHoldingAccountId;
            payload.vatWithHoldingAccountName = !vatWithHoldingAccountInfo ? '' : vatWithHoldingAccountInfo.accountIdentifier;

            payload.taxType = this.taxType;
            payload.hasGetFundLevy = this.hasGetFundLevy;
            payload.getFundLevyRate = this.getFundLevyRate;
            payload.hasNationalHealthInsuranceLevy = this.hasNationalHealthInsuranceLevy;
            payload.nationalHealthInsuranceLevyRate = this.nationalHealthInsuranceLevyRate;
            payload.hasCommunicationServiceTax = this.hasCommunicationServiceTax;
            payload.communicationServiceTaxRate = this.communicationServiceTaxRate;

            payload.hasVat = this.hasVat;
            payload.vatRate = this.vatRate;
            payload.hasCovidTax = this.hasCovidTax;
            payload.covidTaxRate = this.covidTaxRate;
            payload.hasVatWithhold = this.hasVatWithhold;
            payload.withHoldingVatPercentage = this.withHoldingVatPercentage;
            payload.grossAmount = parseFloat(this.totalDebit);
            payload.netAmount = parseFloat(this.totalNetAmount);
            payload.totalRetained = parseFloat(this.totalRetentionCredit);
            payload.totalWithheld = 0;
            payload.totalVatWithheld = 0;
            payload.totalVatAmount = 0;
            payload.baseAmount = 0;
            payload.isPayment = true;
            payload.isMultiCurrency = this.isMultiCurrency;
            payload.proposedJournalHeaderId = this.proposedJournalHeaderId;
            payload.proposedJournalDetailIdList = this.proposedJournalDetailIdList;

            if(this.isEditMode){
                payload.id = this.voucherId;
            } 

            this.voucherList.forEach((v) => {

                v.debitAccountId = v.accountId;

                v.debitAmount = parseFloat(v.localDebitAmount || 0);
                v.foreignDebitAmount = parseFloat(v.foreignDebitAmount || 0);
                v.amount = parseFloat(v.localDebitAmount || 0);

                v.isWithHeld = v.withHold;
                // Do NOT regenerate v.id here — mutating the id causes stale
                // references and is unnecessary since the server always inserts
                // fresh journal detail rows.
                if (!v.id) v.id = this.uuid();

                let debitAccountInfo = this.accountsList.find(a => a.id === v.accountId);
                v.debitAccountName = debitAccountInfo.accountIdentifier;

                v.ouId = v.ouId ? v.ouId : this.emptyGuid;

                let ouInfo = this.costCenterHierachyList.find(a => a.id === v.ouId);
                v.ouName = ouInfo ? ouInfo.name : '--';

            });

            this.retentionsList.forEach((v) => {
                v.creditAccountId = v.accountId;
                let creditAccountInfo = this.accountsList.find(a => a.id === v.accountId);
                v.creditAccountName = creditAccountInfo.accountIdentifier;
            });

            payload.details = this.voucherList;
            payload.retensions = this.retentionsList;

            let saveEndpoint = this.isEditMode ? '/LedgerDataEntry/UpdateVoucher' : '/LedgerDataEntry/CreateVoucher';

            axios.post(saveEndpoint, payload).then((response) => {

                console.log('response.data ->', response.data);

                if (response.data && response.data.id) {
                    this.voucherId = response.data.id;
                    this.isRecordCreated = true;
                }

                this.toastHandler('', `Supplier Payment voucher ${this.isEditMode ? 'updated' : 'saved'}.`);

                this.saveJournal();

            }).catch((error) => {

                this.isLoading = false;

                this.toastHandler('error', `Unable to ${this.isEditMode ? 'update' : 'create'} supplier payment voucher.`);

            });

        },

        postVoucher() {
            if (!this.voucherId) {
                this.toastHandler('warning', 'Please save the voucher before posting.');
                return;
            }

            this.isLoading = true;
            axios.post('/LedgerDataEntry/PostVouchers', { ids: [this.voucherId] })
                .then(response => {
                    this.toastHandler('success', 'Voucher posted successfully.');
                    setTimeout(() => {
                        window.location.href = '/LedgerDataEntry/CustomerReceiptVouchersList';
                    }, 2000);
                }).catch(err => {
                    this.isLoading = false;
                    this.toastHandler('error', 'Unable to post voucher.');
                });
        },

        deleteVoucher() {
            if (!this.voucherId) {
                this.toastHandler('warning', 'Voucher not found.');
                return;
            }

            if (!confirm('Are you sure you want to delete this voucher?')) {
                return;
            }

            this.isLoading = true;
            axios.get('/LedgerDataEntry/DelVoucher?id=' + this.voucherId).then(response => {
                this.toastHandler('success', 'Voucher deleted successfully.');
                setTimeout(() => {
                    window.location.href = '/LedgerDataEntry/CustomerReceiptVouchersList';
                }, 2000);
            }).catch(err => {
                this.isLoading = false;
                this.toastHandler('error', 'Unable to delete voucher.');
            });
        },

        rebuildJournalEntryList() {
            let journalLines = [];

            const currencyInfo = this.currencyList.find(x => x.id === this.currencyId);
            const bankAccountInfo = this.accountsList.find(x => x.id === this.bankAccountId);

            const commonFields = (accountId, accountInfo, ouId) => {
                const ouInfo = this.costCenterHierachyList.find(x => x.id === ouId);
                return {
                    id: this.uuid(),
                    accountId: accountId,
                    accountName: !accountInfo ? '' : accountInfo.accountIdentifier,
                    ouId: ouId,
                    ouName: !ouInfo ? '' : ouInfo.name,
                    transactionDate: this.voucherEntryDate,
                    transactionSource: 'gl',
                    currencyId: this.currencyId,
                    currencyName: !currencyInfo ? '' : currencyInfo.currencyName,
                    currencyCode: !currencyInfo ? '' : currencyInfo.currencyCode,
                    buyRate: !currencyInfo ? '' : currencyInfo.buyRate,
                    sellRate: !currencyInfo ? '' : currencyInfo.sellRate,
                    pettyCashReceipientId: this.emptyGuid,
                    chequeNo: this.chequeNo || '--',
                    referenceNumber: this.batchNo,
                };
            };

            // Receipt vouchers always produce exactly 2 journal rows:
            //   Row 1 – DEBIT  : Bank / Cash GL account (money received into the bank)
            //   Row 2 – CREDIT : AR / Customer GL account (reduces the receivable balance)

            // Sum directly from voucherList — this.totalDebit is not kept live
            // in this file (no reComputeVoucherSummary), so reading it would always be 0.
            const totalAmount = this.voucherList.reduce(
                (sum, v) => sum + parseFloat(v.localDebitAmount || v.debitAmount || 0), 0
            );
            const firstOuId = this.voucherList.length ? this.voucherList[0].ouId : null;
            const firstRef   = this.voucherList.length ? (this.voucherList[0].referenceNo || this.batchNo) : this.batchNo;
            const baseDesc   = this.chequeNo
                ? `Voucher (#${this.batchNo}) Cheque No.: ${this.chequeNo}`
                : `Voucher (#${this.batchNo})`;

            // ── Row 1: DEBIT → Bank / Cash GL ──
            journalLines.push({
                ...commonFields(this.bankAccountId, bankAccountInfo, firstOuId),
                invoiceNo: '',
                referenceNumber: firstRef,
                description: baseDesc,
                debitAmount: totalAmount,
                creditAmount: 0,
            });

            // ── Row 2: CREDIT → AR / Customer GL (first voucher row's account) ──
            const arAccountId = this.voucherList.length ? this.voucherList[0].accountId : null;
            const arAccountInfo = arAccountId ? this.accountsList.find(x => x.id === arAccountId) : null;

            journalLines.push({
                ...commonFields(arAccountId, arAccountInfo, firstOuId),
                invoiceNo: this.voucherList.length ? this.voucherList[0].invoiceNo : '',
                referenceNumber: firstRef,
                description: baseDesc,
                debitAmount: 0,
                creditAmount: totalAmount,
            });

            this.journalEntryList = journalLines;
        },

        saveJournal() {

            this.rebuildJournalEntryList();

            // Same live-sum approach as rebuildJournalEntryList
            const totalAmount = this.voucherList.reduce(
                (sum, v) => sum + parseFloat(v.localDebitAmount || v.debitAmount || 0), 0
            );

            let payload = {};
            payload.batchNumber = this.batchNo;
            payload.batchDate = this.voucherEntryDate;
            payload.isTemporary = true;
            payload.totalCredit = totalAmount;
            payload.totalDebit = totalAmount;
            payload.id = this.voucherId;
            payload.journalDetails = this.journalEntryList;

            axios.post('/LedgerDataEntry/CreateJournal', payload).then(response => {

                this.journalEntryList = [];

                this.isLoading = false;
                
                if (this.voucherId) {
                    axios.get('/LedgerDataEntry/GetVoucherDetails?id=' + this.voucherId).then(res => {
                        if (res.data && res.data.proposedJournalHeader) {
                            this.proposedJournalHeaderId = res.data.proposedJournalHeader.id;
                            this.proposedJournalDetailIdList = (res.data.proposedJournalDetails || []).map(a => a.id);
                        }
                    }).catch(() => {
                        // Non-critical: if the refresh fails the user can still
                        // continue — the next save might re-create the journal but
                        // UpdateVoucher's delete will handle any orphan cleanup.
                    });
                }

            }).catch(err => {

                this.isLoading = false;

                this.toastHandler('error', 'Unable to create journal.');

            });

        },

        previewVoucher() {
            
            window.open('/LedgerDataEntry/ReceiptVoucherPreview?id=' + this.voucherId, '_blank');
        },

        createNewVoucher() {
            // Clear all form data to start fresh
            this.resetForm();
            this.isRecordCreated = false;

            // Re-initialize the form
            this.initPaymentVoucher();

            this.toastHandler('', 'Form cleared for new voucher entry.');
        },

        resetForm() {
            // Reset all form data
            this.voucherId = '';
            this.supplierId = '';
            this.bankId = '';
            this.currencyId = '';
            this.voucherEntryDate = moment().format("YYYY-MM-DD");
            this.paymentDate = moment().format("YYYY-MM-DD");
            this.batchNo = '';
            this.chequeNo = '';
            this.modePayment = 'Cash';
            this.taxType = '';
            this.withHoldingRate = 0.00;
            this.vatWithHoldingAccountId = '';
            this.withHoldingAccountId = '';

            // Reset all totals
            this.totalVatAmount = 0.00;
            this.totalWithHeldAmount = 0.00;
            this.totalVatWithHeldAmount = 0.00;
            this.totalRetentionCredit = 0.00;
            this.totalCredit = 0.00;
            this.totalDebit = 0.00;
            this.totalNetAmount = 0.00;
            this.amountWithoutTaxes = 0.00;

            // Reset tax flags
            this.hasGetFundLevy = false;
            this.hasVat = false;
            this.hasVatWithhold = false;
            this.hasNationalHealthInsuranceLevy = false;
            this.hasCommunicationServiceTax = false;
            this.hasCovidTax = false;
            this.hasWithHolding = false;

            // Reset tax rates
            this.nationalHealthInsuranceLevyRate = 0.00;
            this.communicationServiceTaxRate = 0.00;
            this.vatRate = 0.00;
            this.getFundLevyRate = 0.00;
            this.covidTaxRate = 0.00;
            this.withHoldingVatPercentage = 7.00;

            // Clear arrays
            this.voucherList = [];
            this.retentionsList = [];
            this.journalEntryList = [];

            // Reset currency info
            this.isMultiCurrency = false;
            this.currencyRate = null;

            // Clear validation state
            this.$v.$reset();
        },
        
        addVoucherRow() {
            this.voucherList.push({
                id: this.uuid(),
                withHold: false,
                invoiceNo: '',
                referenceNo: '',
                accountId: '',
                description: '',
                localDebitAmount: 0,
                foreignDebitAmount: 0,
                ouId: '',       
            });
            
        },

        roundNumber(number){

            return Math.round(number * 100) / 100;
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
    watch: {

        bankAccountId(val) {

            const account = this.accountsList.find(a => a.id === val);

            if (account && account.currencyId) {
                this.currencyId = account.currencyId;
            }
        },

        currencyId(val) {
            const currency = this.currencyList.find(c => c.id === val);
            if (currency) {
                this.currencyRate = currency.buyRate ? parseFloat(currency.buyRate).toFixed(2) : null;
                this.isMultiCurrency = currency.isDefault === false;
            } else {
                this.currencyRate = null;
                this.isMultiCurrency = false;
            }
        },
        
    },
    
    async created() {

         
        await Promise.all([
            this.getBanks(),
            this.getCustomers(),
            this.getCurrencies(),
            this.initReceiptVoucher()
        ]);

        if (this.isEditMode) {
            await this.loadVoucherDetails();
        }else{
            this.addVoucherRow();
        }

    },
});