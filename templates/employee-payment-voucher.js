Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

let vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        isShimmerLoading: true,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        accountsList: [],
        bankList: [],
        currencyList: [],
        payload: {},
        taxType: '',
        transactionId: 1,
        hasGetFundLevy: false,
        hasVat: false,
        hasVatWithhold: false,
        hasNationalHealthInsuranceLevy: false,
        nationalHealthInsuranceLevyRate: 0.00,
        hasCommunicationServiceTax: false,
        communicationServiceTaxRate: 0.00,
        vatRate: 0.00,
        getFundLevyRate: 0.00,
        paymentList: [],
        journalEntryList: [],
        costCenterNameList: [],
        costCenterHierachyList: [],
        costCenterList: [],
        voucherList: [],
        totalVatAmount: 0.00,
        totalWithHeldAmount: 0.00,
        totalVatWithHeldAmount: 0.00,
        totalRetentionCredit: 0.00,
        totalCredit: 0.00,
        totalDebit: 0.00,
        totalNetAmount: 0.00,
        amountWithoutTaxes: 0.00,
        withHoldingRate: 0.00,
        vatWithHoldingAccountId: '',
        withHoldingAccountId: '',
        bankAccountId: '',
        voucherEntryDate: moment().format("YYYY-MM-DD"),
        paymentDate: moment().format("YYYY-MM-DD"),
        batchNo: '',
        modePayment: 'Cash',
        retentionsList: [],
        hasCovidTax: false,
        covidTaxRate: 0.00,
        withHoldingVatPercentage: 7.00,
        employeeId: '',
        bankId: '',
        currencyId: '',
        hasWithHolding: false,
        voucherId: '',
        isEditMode: false,
        chequeNo: '',
        isMultiCurrency: false,
        currencyRate: null,
        isRecordCreated: false,
        voucherBatchSystemNumber: {},
        defaultRates: {
            nationalHealthInsuranceLevyRate: 2.50,
            communicationServiceTaxRate: 5.00,
            vatRate: 15.00,
            getFundLevyRate: 2.50,
            withHoldingVatPercentage: 7.00,
            covidTaxRate: 1.00
        },
        proposedJournalHeaderId: '',
        proposedJournalDetailIdList: []

    },

    validations() {

        return {

            employeeId: {
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
            paymentDate: {
                required,
            }

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

        initPaymentVoucher() {

            this.isShimmerLoading = true;

            return axios.get('/LedgerDataEntry/InitSupplierPvEntry').then(response => {

                response.data.accounts.forEach((v) => {
                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;
                });

                this.accountsList = response.data.accounts;

                this.costCenterHierachyList = this.parseCostCenterHierachy(response.data.costCenters);

                this.voucherBatchSystemNumber = response.data.voucherBatchSystemNumber;

                this.batchNo = `${response.data.voucherBatchSystemNumber.prefix}${response.data.voucherBatchSystemNumber.lastNo}${response.data.voucherBatchSystemNumber.suffix}`;

                const defaultBankId = response.data.defaultGlNumbers.accountPayablesBankAccountId;
                this.bankAccountId = defaultBankId;

                let accountInfo = this.accountsList.find(a => a.id === defaultBankId);

                if (accountInfo && accountInfo.currencyId) {
                    this.currencyId = accountInfo.currencyId;
                }

            }).catch(err => {

                this.toastHandler('error', 'Voucher initialization failed.');

            }).finally(() => {
                this.isShimmerLoading = false;
                abp.ui.clearBusy('body');

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

                this.reComputeVoucherSummary();

            }).catch(err => {
                this.toastHandler('error', 'Unable to load voucher details.');
            }).finally(() => {
                this.isShimmerLoading = false;
                abp.ui.clearBusy('body');
            });
        },

        getEmployees() {

            return axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {
                    v.employeeName = v.otherName === '' || null
                        ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}`
                        : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`;
                });

                this.employeeList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve employees');

            });
        },

        getBanks() {

            return axios.get('/SharedResource/GetBanks').then(response => {

                this.bankList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve banks.');

            });
        },

        getCurrencies() {

            return axios.get('/SharedResource/GetCurrencys').then(response => {

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

            let employeeInfo = this.employeeList.find(a => a.id === this.employeeId);
            let bankAccountInfo = this.accountsList.find(a => a.id === this.bankAccountId);
            let withHoldingAccountInfo = this.accountsList.find(a => a.id === this.withHoldingAccountId);
            let vatWithHoldingAccountInfo = this.accountsList.find(a => a.id === this.vatWithHoldingAccountId);
            let bankInfo = this.bankList.find(a => a.id === this.bankId);
            let currencyInfo = this.currencyList.find(a => a.id === this.currencyId);

            payload.employeeId = this.employeeId;
            payload.employeeName = employeeInfo.employeeName;
            payload.supplierId = this.emptyGuid;
            payload.supplierName = '';
            payload.customerId = this.emptyGuid;
            payload.customerName = '';
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
            payload.withHoldingRate = parseFloat(this.withHoldingRate);

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
            payload.totalWithheld = parseFloat(this.totalWithHeldAmount);
            payload.totalVatWithheld = parseFloat(this.totalVatWithHeldAmount);
            payload.totalVatAmount = parseFloat(this.totalVatAmount);
            payload.baseAmount = parseFloat(this.amountWithoutTaxes);
            payload.isPayment = true;
            payload.isMultiCurrency = this.isMultiCurrency;
            payload.proposedJournalHeaderId = this.proposedJournalHeaderId;
            payload.proposedJournalDetailIdList = this.proposedJournalDetailIdList;
            payload.id = this.voucherId;

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

                this.toastHandler('', `Employee Payment voucher ${this.isEditMode ? 'updated' : 'saved'}.`);

                this.saveJournal();

            }).catch((error) => {

                this.isLoading = false;

                this.toastHandler('error', `Unable to ${this.isEditMode ? 'update' : 'create'} employee payment voucher.`);

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
                        window.location.href = '/LedgerDataEntry/EmployeePaymentVouchersList';
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
                    window.location.href = '/LedgerDataEntry/EmployeePaymentVouchersList';
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
            const withHoldingAccountInfo = this.accountsList.find(x => x.id === this.withHoldingAccountId);
            const vatWithHoldingAccountInfo = this.accountsList.find(x => x.id === this.vatWithHoldingAccountId);

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

            // ── DEBIT lines: one per voucher row ──
            this.voucherList.forEach(v => {
                const debitAccountInfo = this.accountsList.find(x => x.id === v.accountId);
                const debitAmount = parseFloat(v.localDebitAmount || v.debitAmount || 0);
                const description = `Voucher (#${this.batchNo}) Cheque No.: ${this.chequeNo || 'N/A'} - ${v.description || ''}`.trim();

                journalLines.push({
                    ...commonFields(v.accountId, debitAccountInfo, v.ouId),
                    invoiceNo: v.invoiceNo,
                    referenceNumber: v.referenceNo || this.batchNo,
                    description: description,
                    debitAmount: debitAmount,
                    creditAmount: 0,
                });
            });

            const firstOuId = this.voucherList.length ? this.voucherList[0].ouId : null;

            // ── CREDIT line 1: Net Amount → Bank G/L ──
            const netAmount = parseFloat(this.totalNetAmount || 0);
            if (netAmount !== 0) {
                journalLines.push({
                    ...commonFields(this.bankAccountId, bankAccountInfo, firstOuId),
                    invoiceNo: '',
                    referenceNumber: this.voucherList[0].referenceNo || this.batchNo,
                    description: this.chequeNo ? `Voucher (#${this.batchNo}) Cheque No.: ${this.chequeNo}` : `Voucher (#${this.batchNo})`,
                    debitAmount: 0,
                    creditAmount: netAmount,
                });
            }

            // ── CREDIT line 2: VAT Withheld Amount → VAT/Withhold Account ──
            const vatWithHeldAmount = parseFloat(this.totalVatWithHeldAmount || 0);
            if (vatWithHeldAmount > 0 && this.vatWithHoldingAccountId) {

                journalLines.push({
                    ...commonFields(this.vatWithHoldingAccountId, vatWithHoldingAccountInfo, firstOuId),
                    invoiceNo: '',
                    referenceNumber: this.voucherList[0].referenceNo || this.batchNo,
                    description: `${parseFloat(this.withHoldingVatPercentage || 0)}% withholding VAT`,
                    debitAmount: 0,
                    creditAmount: vatWithHeldAmount,
                });
            }

            // ── CREDIT line 3: WithHeld Amount → WithHolding Credit G/L Account ──
            const withHeldAmount = parseFloat(this.totalWithHeldAmount || 0);
            if (withHeldAmount > 0 && this.withHoldingAccountId) {

                journalLines.push({
                    ...commonFields(this.withHoldingAccountId, withHoldingAccountInfo, firstOuId),
                    invoiceNo: '',
                    referenceNumber: this.voucherList[0].referenceNo || this.batchNo,
                    description: `${parseFloat(this.withHoldingRate || 0)}% Withholding Tax`,
                    debitAmount: 0,
                    creditAmount: withHeldAmount,
                });
            }

            this.journalEntryList = journalLines;
        },

        saveJournal() {

            this.rebuildJournalEntryList();

            const vatWithHeldAmount = parseFloat(this.totalVatWithHeldAmount || 0);
            const withHeldAmount = parseFloat(this.totalWithHeldAmount || 0);

            let payload = {};
            payload.batchNumber = this.batchNo;
            payload.batchDate = this.voucherEntryDate;
            payload.isTemporary = true;
            payload.totalCredit = this.totalNetAmount + vatWithHeldAmount + withHeldAmount;
            payload.totalDebit = this.totalDebit;
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
            window.open('/LedgerDataEntry/PaymentVoucherPreview?id=' + this.voucherId, '_blank');
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
            this.employeeId = '';
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
                hasImprest: false,
            });
            this.reComputeVoucherSummary();
        },

        removeVoucherRow(index) {
            this.voucherList.splice(index, 1);
            this.reComputeVoucherSummary();
        },

        onWithHoldChange() {
            this.hasWithHolding = this.voucherList.some(v => v.withHold);
            this.reComputeVoucherSummary();
        },

        addRetentionRow() {
            this.retentionsList.push({
                id: this.uuid(),
                description: '',
                accountId: '',
                amount: 0,
                IsPercentage: false,
                totalAmount: 0
            });
            this.reComputeVoucherSummary();
        },

        removeRetentionRow(index) {
            this.retentionsList.splice(index, 1);
            this.reComputeVoucherSummary();
        },

        onRetentionAmountChange(row) {
            let amount = parseFloat(row.amount || 0);
            if (row.IsPercentage) {
                row.totalAmount = amount;
            } else {
                row.totalAmount = (amount / 100) * this.totalDebit;
            }
            this.reComputeVoucherSummary();
        },

        calculateVoucherBreakdown(amount, withHold) {

            /*
             * Returns a pure per-row breakdown.
             * totalRetentionCredit is a batch-level deduction and must NOT be
             * subtracted here — reComputeVoucherSummary applies it once after
             * all rows have been summed.
             *
             * withHold (boolean): when true the row's gross amount is treated as
             * tax-inclusive and withholding/VAT-withhold deductions apply.
             * When false the row is a plain payment with no withholding at all.
             * In both cases the same global withHoldingRate is used — individual
             * rows cannot carry different rates.
             */

            const grossAmount = parseFloat(amount || 0);

            const nhilRate = parseFloat(
                this.nationalHealthInsuranceLevyRate || 0
            );

            const getflRate = parseFloat(
                this.getFundLevyRate || 0
            );

            const vatRate = parseFloat(
                this.vatRate || 0
            );

            const withholdingRate = parseFloat(
                this.withHoldingRate || 0
            );

            const withHoldingVatRate = parseFloat(
                this.withHoldingVatPercentage || 0
            );

            let baseAmount = grossAmount;

            let nhilAmount = 0;
            let getflAmount = 0;
            let vatAmount = 0;
            let withHeldAmount = 0;
            let vatWithHeldAmount = 0;

            /*
            ===================================================
            ONLY reverse-calculate taxes when withholding applies
            ===================================================
            */
            if (withHold) {

                const totalRate =
                    nhilRate +
                    getflRate +
                    vatRate;

                // reverse extract base amount from the tax-inclusive gross
                baseAmount = totalRate > 0
                    ? grossAmount / (1 + totalRate / 100)
                    : grossAmount;

                // tax components on base
                nhilAmount = this.hasNationalHealthInsuranceLevy ? (nhilRate / 100) * baseAmount : 0;

                getflAmount = this.hasGetFundLevy ? (getflRate / 100) * baseAmount : 0;

                vatAmount = this.hasVat ? (vatRate / 100) * baseAmount : 0;

                // withholding deducted from base
                withHeldAmount = (withholdingRate / 100) * baseAmount;

                vatWithHeldAmount = this.hasVatWithhold ? (withHoldingVatRate / 100) * baseAmount : 0;

            }

            /*
            ===================================================
            NORMAL transactions (no withholding for this row)
            ===================================================
            */
            else {
                baseAmount = grossAmount;
            }

            // netAmount = what the employee actually receives for this row
            const netAmount = grossAmount - withHeldAmount - vatWithHeldAmount;

            const amountWithoutTaxes = withHold
                ? grossAmount - nhilAmount - getflAmount - vatAmount
                : 0;

            return {

                grossAmount:        this.roundNumber(grossAmount),

                baseAmount:         this.roundNumber(baseAmount),

                nhilAmount:         this.roundNumber(nhilAmount),

                getflAmount:        this.roundNumber(getflAmount),

                vatAmount:          this.roundNumber(vatAmount),

                withHeldAmount:     this.roundNumber(withHeldAmount),

                vatWithHeldAmount:  this.roundNumber(vatWithHeldAmount),

                netAmount:          this.roundNumber(netAmount),

                amountWithoutTaxes: this.roundNumber(amountWithoutTaxes),

            };

        },

        reComputeVoucherSummary() {

            /*
             * Reset every running total to zero before iterating so the function
             * is safe to call multiple times.
             */
            this.totalVatAmount         = 0;
            this.totalWithHeldAmount    = 0;
            this.totalVatWithHeldAmount = 0;
            this.totalNetAmount         = 0;
            this.totalCredit            = 0;
            this.totalDebit             = 0;
            this.amountWithoutTaxes     = 0;

            this.voucherList.forEach((transaction) => {

                const debitAmount = parseFloat(
                    transaction.localDebitAmount ||
                    transaction.debitAmount ||
                    0
                );

                this.totalDebit += debitAmount;

                const breakdown = this.calculateVoucherBreakdown(
                    debitAmount,
                    transaction.withHold
                );

                this.totalVatAmount         += breakdown.vatAmount;
                this.totalWithHeldAmount    += breakdown.withHeldAmount;
                this.totalVatWithHeldAmount += breakdown.vatWithHeldAmount || 0;
                this.totalNetAmount         += breakdown.netAmount;
                this.amountWithoutTaxes     += breakdown.amountWithoutTaxes;

            });

            /*
             * totalRetentionCredit is a batch-level deduction.
             */
            this.totalRetentionCredit = this.retentionsList.reduce((sum, r) => sum + parseFloat(r.totalAmount || 0), 0);
            this.totalNetAmount      -= parseFloat(this.totalRetentionCredit || 0);
            this.amountWithoutTaxes  -= parseFloat(this.totalRetentionCredit || 0);

            // round final totals
            this.totalDebit             = this.roundNumber(this.totalDebit);
            this.totalCredit            = this.roundNumber(this.totalCredit);
            this.totalVatAmount         = this.roundNumber(this.totalVatAmount);
            this.totalWithHeldAmount    = this.roundNumber(this.totalWithHeldAmount);
            this.totalVatWithHeldAmount = this.roundNumber(this.totalVatWithHeldAmount);
            this.totalNetAmount         = this.roundNumber(this.totalNetAmount);
            this.amountWithoutTaxes     = this.roundNumber(this.amountWithoutTaxes);
            this.totalRetentionCredit   = this.roundNumber(this.totalRetentionCredit);

        },

        roundNumber(number) {
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

        withHoldingRate(val) {

            if (val) {
                this.reComputeVoucherSummary();
            }

        },

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

        hasGetFundLevy(val) {

            if (val) {
                this.getFundLevyRate = this.defaultRates.getFundLevyRate;
            }
            else {
                this.getFundLevyRate = 0.00;
            }

            this.reComputeVoucherSummary();

        },

        hasVat(val) {

            if (val) {
                this.vatRate = this.defaultRates.vatRate;
            }
            else {
                this.vatRate = 0.00;
            }

            this.reComputeVoucherSummary();

        },

        hasVatWithhold(val) {

            if (val) {
                this.withHoldingVatPercentage = this.defaultRates.withHoldingVatPercentage;
            }
            else {
                this.withHoldingVatPercentage = 0.00;
            }

            this.reComputeVoucherSummary();

        },

        hasNationalHealthInsuranceLevy(val) {

            if (val) {
                this.nationalHealthInsuranceLevyRate = this.defaultRates.nationalHealthInsuranceLevyRate;
            }
            else {
                this.nationalHealthInsuranceLevyRate = 0.00;
            }

            this.reComputeVoucherSummary();
        },

        hasCommunicationServiceTax(val) {

            if (val) {

                if (this.hasCovidTax) {

                    this.toastHandler('warning', 'CST & Covid Taxes cannot be used at the same.');
                    this.hasCommunicationServiceTax = false;

                    const checkboxRef = this.$refs.hasCommunicationServiceTax;

                    if (checkboxRef) {
                        checkboxRef.checked = !checkboxRef.checked;
                        checkboxRef.dispatchEvent(new Event('change'));
                    }
                    return;
                }

                this.communicationServiceTaxRate = this.defaultRates.communicationServiceTaxRate;

            }
            else {
                this.communicationServiceTaxRate = 0.00;
            }

            this.reComputeVoucherSummary();
        },

        hasCovidTax(val) {

            if (val) {

                if (this.hasCommunicationServiceTax) {

                    this.toastHandler('warning', 'CST & Covid Taxes cannot be used at the same.');
                    this.hasCovidTax = false;

                    const checkboxRef = this.$refs.hasCovidTax;

                    if (checkboxRef) {
                        checkboxRef.checked = !checkboxRef.checked;
                        checkboxRef.dispatchEvent(new Event('change'));
                    }
                    return;
                }

                this.covidTaxRate = this.defaultRates.covidTaxRate;
            }
            else {
                this.covidTaxRate = 0.00;
            }

            this.reComputeVoucherSummary();
        },

    },

    async created() {

        if (typeof voucherId !== 'undefined' && voucherId !== '' && voucherId !== this.emptyGuid) {
            this.voucherId = voucherId;
            this.isEditMode = true;
        }

        this.withHoldingVatPercentage = withHoldingVatPercentage;

        // Load all reference lists first, then load voucher details.
        // This order is critical: the lists must be populated BEFORE IDs
        // are set so native <select> v-model can match the correct option.
        await Promise.all([
            this.getBanks(),
            this.getEmployees(),
            this.getCurrencies(),
            this.initPaymentVoucher(),
        ]);

        if (this.isEditMode) {
            await this.loadVoucherDetails();
        }else{
            this.addVoucherRow();
        }

    },
});