const { createApp } = Vue;
const { required, numeric } = VuelidateValidators;
const useVuelidate = Vuelidate.useVuelidate;

createApp({
    data() {
        return {
            isLoading: false,
            accountName: '',
            accountNo: null,
            status: 'Active',
            accountControlId: '',
            currencyId: '',
            id: null,
            modalTitle: 'Add Account Detail',
            setupEntityName: 'Account Detail',
            showSetupModal: false,
            accountControlList: [],
            currencyList: [],
            accountExists: false,
            debounceTimer: null
        }
    },
    validations() {
        return {
            accountName: { required },
            accountControlId: { required },
            accountNo: { required, numeric },
            currencyId: { required },
            status: { required }
        };
    },
    setup() {
        return { v$: useVuelidate() };
    },
    methods: {

        debouncedCheckAccountDetails() {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.checkAccountDetails();
            }, 500);
        },

        initDeleteSetup(id) {
            this.id = id;
            $("#deleteModal").modal('show');
        },

        getCurrencies() {
            axios.get('/Settings/GetCurrencies/?pageNo=1&pageSize=1000').then((response) => {
                this.currencyList = response.data.result.data;
            }).catch((error) => {
                console.log(error);
            });
        },

        deleteSetup() {
            this.isLoading = true;

            axios.get('/GeneralLedger/DeleteAccountDetail?id=' + this.id).then((response) => {
                location.reload();
            }).catch((error) => {
                console.log(error);
                this.isLoading = false;
            });
        },

        checkAccountDetails() {
            if (!this.accountNo || !this.accountControlId) return;

            axios.get('/GeneralLedger/CheckAccountDetails/?accountNumber=' + this.accountNo + "&accountControlId=" + this.accountControlId).then((response) => {
                this.accountExists = !!(response.data.result && response.data.result.id);
            }).catch((error) => {
                console.log(error);
            });
        },

        getAccountControls() {
            axios.get('/GeneralLedger/GetAccountControl?pageNo=1&pageSize=1000').then((response) => {
                const rawList = response.data.result.data;

                const map = {};
                rawList.forEach(item => {
                    const id = item.id || item.Id;
                    map[id] = item;
                });

                rawList.forEach(item => {
                    let pathNames = [];
                    let current = item;
                    let visited = new Set();

                    while (current && !visited.has(current.id || current.Id)) {
                        visited.add(current.id || current.Id);
                        pathNames.unshift(current.name || current.Name);

                        const parentId = current.parentControlId || current.ParentControlId;
                        if (parentId && parentId !== '00000000-0000-0000-0000-000000000000' && map[parentId]) {
                            current = map[parentId];
                        } else {
                            current = null;
                        }
                    }
                    item.formattedName = pathNames.join(' / ');
                });

                rawList.sort((a, b) => a.formattedName.localeCompare(b.formattedName));
                this.accountControlList = rawList;
            }).catch((error) => {
                console.log(error);
            });
        },

        addSetup() {
            // Mark all fields as touched to display errors if empty
            this.v$.$touch();

            // Validate Vuelidate form state + custom range/duplicate checks
            if (this.v$.$invalid || this.accountExists || (this.accountNo && !this.isValidAccountNumber)) {
                return;
            }

            this.isLoading = true;

            const selectedCurrency = this.currencyList.find(c => c.id === this.currencyId || c.Id === this.currencyId) || {};
            const selectedControlAccount = this.accountControlList.find(c => c.id === this.accountControlId || c.Id === this.accountControlId) || {};

            const payload = {
                id: this.id || undefined,
                accountName: this.accountName,
                accountNo: this.accountNo,
                status: this.status,
                accountControlId: this.accountControlId,
                currencyId: this.currencyId,
                currencyName: selectedCurrency.name || selectedCurrency.Name || '',
                currencyCode: selectedCurrency.code || selectedCurrency.Code || '',
                accountControlName: selectedControlAccount.parentSubGroupName || selectedControlAccount.ParentSubGroupName || selectedControlAccount.name || selectedControlAccount.Name || ''
            };

            const url = this.id ? '/GeneralLedger/UpdateAccountDetail' : '/GeneralLedger/CreateAccountDetail';

            axios.post(url, payload)
                .then(() => location.reload())
                .catch(error => {
                    console.error(error);
                    this.isLoading = false;
                });
        },

        viewSetupDetails(account) {
            this.id = account.Id;
            this.accountName = account.AccountName;
            this.accountNo = account.AccountNo;
            this.status = account.Status === 1 ? 'Active' : 'Inactive';
            this.accountControlId = account.AccountControlId;
            this.currencyId = account.CurrencyId;
            this.accountExists = false;

            if (this.v$) this.v$.$reset();
            this.modalTitle = `Edit ${this.setupEntityName}`;
            this.showSetupModal = true;
            $("#setupModal").modal('show');
        },

        onAccountNumberInput() {
            if (!this.accountNo) {
                this.accountDetails = {};
                return;
            }
            this.checkAccountDetails();
        },

        resetModal() {
            clearTimeout(this.debounceTimer);
            this.id = null;
            this.accountName = '';
            this.accountNo = null;
            this.status = 'Active';
            this.accountControlId = '';
            this.currencyId = '';
            this.accountExists = false;

            if (this.v$) this.v$.$reset();
            this.modalTitle = `Add ${this.setupEntityName}`;
            this.showSetupModal = true;
            $("#setupModal").modal('show');
        }
    },

    computed: {
        selectedAccountControl() {
            if (!this.accountControlId) return null;
            return this.accountControlList.find(c => c.id === this.accountControlId || c.Id === this.accountControlId);
        },
        accountNumberRangeMessage() {
            const ctrl = this.selectedAccountControl;
            if (ctrl) {
                const min = ctrl.minAccount || ctrl.MinAccount;
                const max = ctrl.maxAccount || ctrl.MaxAccount;
                if (min !== undefined && max !== undefined) {
                    return `Permitted Range: ${min} - ${max}`;
                }
            }
            return '';
        },
        isValidAccountNumber() {
            if (!this.accountNo || !this.selectedAccountControl) return true;
            const ctrl = this.selectedAccountControl;
            const min = ctrl.minAccount || ctrl.MinAccount; // Fixed syntax error here
            const max = ctrl.maxAccount || ctrl.MaxAccount;
            if (min !== undefined && max !== undefined) {
                const no = parseInt(this.accountNo, 10);
                return no >= min && no <= max;
            }
            return true;
        }
    },
    mounted() {
        this.getCurrencies();
        this.getAccountControls();
    }
}).mount("#app");