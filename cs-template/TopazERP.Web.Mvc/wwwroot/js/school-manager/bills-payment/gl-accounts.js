const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            billTypeId: 1,
            paymentAccountForm: {
                id: null,
                localDebitGlId: this.emptyGuid,
                localCreditGlId: this.emptyGuid,
                foreignDebitGlId: this.emptyGuid,
                foreignOverPaymentGlId: this.emptyGuid,
                otherPaymentDebitGlId: this.emptyGuid,
                otherPaymentCreditGlId: this.emptyGuid,
                tenantId: null,
            },
            creditMemoForm: {
                id: null,
                debitGlId: this.emptyGuid,
                creditGlId: this.emptyGuid,
                tenantId: null,
            },
            billAccounts: [],
            paymentAccounts: [],
            creditMemoAccounts: [],
            accountsList: [],
            billTypes: [],
            feeItems:[],
            billGrid: [],
        }
    },
    methods: {

        // ─── GL ACCOUNTS ────────────────────────────────────────────────────────────

        getGlAccounts() {

            axios.get('/LedgerDataEntry/InitJournalEntry')
                .then(response => {

                    let accounts = response.data.accounts;

                    if (!accounts || accounts.length === 0) {

                        accounts = [{
                            id: this.emptyGuid,
                            accountIdentifier: 'No Ledger Available'
                        }];

                    } else {

                        accounts.forEach(v => {

                            v.accountIdentifier =
                                `${v.accountNo} - ${v.accountName}`;
                        });

                        accounts.sort((a, b) => {
                            return Number(a.accountNo) - Number(b.accountNo);
                        });
                    }

                    this.accountsList = accounts;
                })
                .catch(() => {

                    this.toastHandler(
                        'error',
                        'Failed to load GL accounts.'
                    );
                });
        },

        // ─── BILL ACCOUNTS ───────────────────────────────────────────────────────────
        async onBillTypeChange() {
            await this.getFeeTypes();
            await this.getBillAccounts();
            this.buildBillGrid();

        },
        setBillType(typeId) {
            this.billTypeId = typeId;

          this.onBillTypeChange(); 
        },
        getFeeTypes() {
            let url = '';

            if (this.billTypeId === 1) {
                url = '/SmMainSetups/ListAllFeesDescriptions/';
            }
            else if (this.billTypeId === 2) {
                url = '/SmMainSetups/ListAllSupplementaryItems/';
            }
            else if (this.billTypeId === 3) {
                url = '/SmMainSetups/GetBoardingItems/';
            }

            this.isLoading = true;
            return axios.get(url)
                .then(res => {

                    this.feeItems = res.data;

                    this.feeItems.forEach(f => {
                        f.name = f.description || f.name;
                    });
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to load fee types.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        getBillAccounts() {
            this.isLoading = true;
            return axios.get('/SmBillingAndPayments/GetBillAccounts')
                .then(response => {
                    this.billAccounts = response.data;
                    this.buildBillGrid();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to load bill accounts.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        getBillTypes(){
            this.isLoading = true;
            axios.get(`/jsonDataSample/billTypes.json?v=${new Date().getTime()}`)
                .then(response => {
                    this.billTypes = response.data;
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to load bill type.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        buildBillGrid() {
            this.billGrid = this.feeItems.map(fee => {
                // find existing saved account mapping
                const existing = this.billAccounts.find(x =>
                    x.billTypeId === this.billTypeId &&
                    x.feeItemId === fee.id
                );

                return {
                    id: existing ? existing.id : null,
                    billTypeId: this.billTypeId,
                    feeItemId: fee.id,
                    feeItemName: fee.name,
                    bankGlId: existing ? existing.bankGlId : null,
                    debitGlId: existing ? existing.debitGlId : null,
                    creditGlId: existing ? existing.creditGlId : null,
                    tenantId: existing ? existing.tenantId : null,
                };
            });
        },
        saveBillRow(row) {
            if (!row.bankGlId || !row.debitGlId || !row.creditGlId)
            {
                this.toastHandler('error', 'Please add all GL accounts.');
                return;
            }
            this.isLoading = true;
            const url = row.id
                ? '/SmBillingAndPayments/UpdateBillAccount'
                : '/SmBillingAndPayments/CreateBillAccount';

            const payload = {
                id: row.id,
                billTypeId: row.billTypeId,
                feeItemId: row.feeItemId,
                bankGlId: row.bankGlId,
                debitGlId: row.debitGlId,
                creditGlId: row.creditGlId,
                tenantId: row.tenantId
            };

            axios.post(url, payload)
                .then(() => {
                    this.toastHandler('success', 'Saved successfully');
                    this.getBillAccounts();
                    this.buildBillGrid();
                    this.isLoading = false;
                })
                .catch(() => {
                    this.isLoading = false;
                    this.toastHandler('error', 'Save failed');
                });
        },
        createBillAccount() {
            const payload = {
                billTypeId: this.billAccountForm.billTypeId,
                feeItemId: this.billAccountForm.feeItemId,
                bankGlId: this.billAccountForm.bankGlId,
                debitGlId: this.billAccountForm.debitGlId,
                creditGlId: this.billAccountForm.creditGlId,
            };
            this.isLoading = true;
            axios.post('/SmBillingAndPayments/CreateBillAccount', payload)
                .then(response => {
                    this.toastHandler('success', 'Bill account created successfully.');
                    this.getBillAccounts();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to create bill account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        updateBillAccount() {
            const payload = {
                id: this.billAccountForm.id,
                billTypeId: this.billAccountForm.billTypeId,
                feeItemId: this.billAccountForm.feeItemId,
                bankGlId: this.billAccountForm.bankGlId,
                debitGlId: this.billAccountForm.debitGlId,
                creditGlId: this.billAccountForm.creditGlId,
                tenantId: this.billAccountForm.tenantId,
            };
            this.isLoading = true;
            axios.post('/SmBillingAndPayments/UpdateBillAccount', payload)
                .then(response => {
                    this.toastHandler('success', 'Bill account updated successfully.');
                    this.getBillAccounts();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to update bill account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        deleteBillAccount(id) {
            if (!confirm('Are you sure you want to delete this bill account?')) return;
            this.isLoading = true;
            axios.delete(`/SmBillingAndPayments/DeleteBillAccount?id=${id}`)
                .then(response => {
                    this.toastHandler('success', 'Bill account deleted successfully.');
                    this.getBillAccounts();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to delete bill account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        setBillAccountForm(account) {
            this.billAccountForm = { ...account };
        },
        // ─── PAYMENT ACCOUNTS ────────────────────────────────────────────────────────
        getPaymentAccounts() {
            this.isLoading = true;

            axios.get('/SmBillingAndPayments/GetPaymentAccounts')
                .then(async response => {

                    this.paymentAccounts = response.data[0];
                    // only one row should be returned, so we take the first item if it exists

                    if (this.paymentAccounts) {
                        this.paymentAccountForm = {
                            id: this.paymentAccounts.id,
                            localDebitGlId: this.paymentAccounts.localDebitGlId,
                            localCreditGlId: this.paymentAccounts.localCreditGlId,
                            foreignDebitGlId: this.paymentAccounts.foreignDebitGlId,
                            foreignOverPaymentGlId: this.paymentAccounts.foreignOverPaymentGlId,
                            otherPaymentDebitGlId: this.paymentAccounts.otherPaymentDebitGlId,
                            otherPaymentCreditGlId: this.paymentAccounts.otherPaymentCreditGlId,
                            tenantId: this.paymentAccounts.tenantId
                        };

                    }
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to load payment accounts.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        createPaymentAccount() {
            if (!this.paymentAccountForm.localDebitGlId || !this.paymentAccountForm.localCreditGlId) {
                this.toastHandler('error', 'Please select both local debit and credit GL accounts.');
                return;
            }
            const payload = {
                localDebitGlId: this.paymentAccountForm.localDebitGlId,
                localCreditGlId: this.paymentAccountForm.localCreditGlId,
                foreignDebitGlId: this.paymentAccountForm.foreignDebitGlId,
                foreignOverPaymentGlId: this.paymentAccountForm.foreignOverPaymentGlId,
                otherPaymentDebitGlId: this.paymentAccountForm.otherPaymentDebitGlId,
                otherPaymentCreditGlId: this.paymentAccountForm.otherPaymentCreditGlId,
            };
            this.isLoading = true;
            axios.post('/SmBillingAndPayments/CreatePaymentAccount', payload)
                .then(response => {
                    this.toastHandler('success', 'Payment account created successfully.');
                    this.getPaymentAccounts();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to create payment account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        updatePaymentAccount() {
            if (!this.paymentAccountForm.localDebitGlId || !this.paymentAccountForm.localCreditGlId) {
                this.toastHandler('error', 'Please select both local debit and credit GL accounts.');
                return;
            }
            const payload = {
                id: this.paymentAccountForm.id,
                localDebitGlId: this.paymentAccountForm.localDebitGlId,
                localCreditGlId: this.paymentAccountForm.localCreditGlId,
                foreignDebitGlId: this.paymentAccountForm.foreignDebitGlId,
                foreignOverPaymentGlId: this.paymentAccountForm.foreignOverPaymentGlId,
                otherPaymentDebitGlId: this.paymentAccountForm.otherPaymentDebitGlId,
                otherPaymentCreditGlId: this.paymentAccountForm.otherPaymentCreditGlId,
                tenantId: this.paymentAccountForm.tenantId,
            };
            this.isLoading = true;
            axios.post('/SmBillingAndPayments/UpdatePaymentAccount', payload)
                .then(response => {
                    this.toastHandler('success', 'Payment account updated successfully.');
                    this.getPaymentAccounts();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to update payment account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        deletePaymentAccount(id) {
            if (!confirm('Are you sure you want to delete this payment account?')) return;
            this.isLoading = true;
            axios.delete(`/SmBillingAndPayments/DeletePaymentAccount?id=${id}`)
                .then(response => {
                    this.toastHandler('success', 'Payment account deleted successfully.');
                    this.getPaymentAccounts();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to delete payment account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        // ─── CREDIT MEMO ACCOUNTS ────────────────────────────────────────────────────

        getCreditMemoAccounts() {
            this.isLoading = true;
            axios.get('/SmBillingAndPayments/GetCreditMemoAccounts')
                .then(response => {
                    this.creditMemoAccounts = response.data[0];
                    // only one row should be returned, so we take the first item if it exists
                    if (this.creditMemoAccounts) {
                        this.creditMemoForm = {
                            id: this.creditMemoAccounts.id,
                            debitGlId: this.creditMemoAccounts.debitGlId,
                            creditGlId: this.creditMemoAccounts.creditGlId,
                            tenantId: this.creditMemoAccounts.tenantId
                        };
                    }
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to load credit memo accounts.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        createCreditMemoAccount() {
            const payload = {
                debitGlId: this.creditMemoForm.debitGlId,
                creditGlId: this.creditMemoForm.creditGlId,
            };
            this.isLoading = true;
            axios.post('/SmBillingAndPayments/CreateCreditMemoAccount', payload)
                .then(response => {
                    this.toastHandler('success', 'Credit memo account created successfully.');
                    this.getCreditMemoAccounts();
                    this.resetCreditMemoForm();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to create credit memo account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        updateCreditMemoAccount() {
            const payload = {
                id: this.creditMemoForm.id,
                debitGlId: this.creditMemoForm.debitGlId,
                creditGlId: this.creditMemoForm.creditGlId,
                tenantId: this.creditMemoForm.tenantId,
            };
            this.isLoading = true;
            axios.post('/SmBillingAndPayments/UpdateCreditMemoAccount', payload)
                .then(response => {
                    this.toastHandler('success', 'Credit memo account updated successfully.');
                    this.getCreditMemoAccounts();
                    this.resetCreditMemoForm();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to update credit memo account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        deleteCreditMemoAccount(id) {
            if (!confirm('Are you sure you want to delete this credit memo account?')) return;
            this.isLoading = true;
            axios.delete(`/SmBillingAndPayments/DeleteCreditMemoAccount?id=${id}`)
                .then(response => {
                    this.toastHandler('success', 'Credit memo account deleted successfully.');
                    this.getCreditMemoAccounts();
                })
                .catch(err => {
                    this.toastHandler('error', 'Failed to delete credit memo account.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        setCreditMemoForm(account) {
            this.creditMemoForm = { ...account };
        },

        resetCreditMemoForm() {
            this.creditMemoForm = {
                id: null,
                debitGlId: null,
                creditGlId: null,
                tenantId: null,
            };
        },

        // ─── TOAST ───────────────────────────────────────────────────────────────────

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
    mounted() {
        this.getGlAccounts();
        this.getBillTypes();
        this.getBillAccounts();
        this.onBillTypeChange();
        this.getPaymentAccounts();
        this.getCreditMemoAccounts();
    }
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');