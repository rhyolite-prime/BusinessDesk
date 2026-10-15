const { createApp } = Vue;
createApp({
    data() {
        return {
            isLoading: false,
            
            // Bank Account properties
            id: null,
            bankName: '',
            bankBranchName: '',
            accountId: '',
            accountNo: '',
            accountType: '',
            currencyId: '',
            address: '',
            location: '',
            contactPerson: '',
            contactNo: '',
            chequeBookStart: '',
            chequeBookEnd: '',
            
            modalTitle: 'Add Bank Account',
            setupEntityName: 'Bank Account',
            
            currencyList: [],
            accountDetailList: [],
        }
    },
    methods: {
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
        
        getAccountDetails() {
            axios.get('/GeneralLedger/GetAccountDetails/?pageNo=1&pageSize=1000').then((response) => {
                this.accountDetailList = response.data.result.data;
            }).catch((error) => {
                console.log(error);
            });
        },

        deleteSetup() {
            this.isLoading = true;
            axios.get('/GeneralLedger/DeleteBankAccount?id=' + this.id).then((response) => {
                location.reload();
            }).catch((error) => {
                console.log(error);
            });
        },

        addSetup() {
            this.isLoading = true;

            const selectedCurrency = this.currencyList.find(c => c.id === this.currencyId || c.Id === this.currencyId) || {};
            const selectedAccount = this.accountDetailList.find(a => a.id === this.accountId || a.Id === this.accountId) || {};

            const payload = {
                id: this.id || undefined,
                bankId: '00000000-0000-0000-0000-000000000000',
                bankName: this.bankName,
                bankBranchId: '00000000-0000-0000-0000-000000000000',
                bankBranchName: this.bankBranchName,
                accountId: this.accountId,
                accountName: selectedAccount.accountName || selectedAccount.AccountName || '',
                address: this.address,
                location: this.location,
                accountNo: this.accountNo,
                accountType: this.accountType,
                currencyId: this.currencyId,
                currencyName: selectedCurrency.name || selectedCurrency.Name || '',
                currencyCode: selectedCurrency.code || selectedCurrency.Code || '',
                contactPerson: this.contactPerson,
                contactNo: this.contactNo,
                chequeBookStart: this.chequeBookStart,
                chequeBookEnd: this.chequeBookEnd,
                dateOpened: new Date().toISOString()
            };

            const url = this.id ? '/GeneralLedger/UpdateBankAccount' : '/GeneralLedger/CreateBankAccount';

            axios.post(url, payload)
                .then(() => location.reload())
                .catch(error => {
                    console.error(error);
                    this.isLoading = false;
                });
        },

        viewSetupDetails(account) {
            this.id = account.Id;
            this.bankName = account.BankName;
            this.bankBranchName = account.BankBranchName;
            this.accountId = account.AccountId;
            this.accountNo = account.AccountNo;
            this.accountType = account.AccountType;
            this.currencyId = account.CurrencyId;
            this.address = account.Address;
            this.location = account.Location;
            this.contactPerson = account.ContactPerson;
            this.contactNo = account.ContactNo;
            this.chequeBookStart = account.ChequeBookStart;
            this.chequeBookEnd = account.ChequeBookEnd;

            this.modalTitle = `Edit ${this.setupEntityName}`;
            $("#setupModal").modal('show');
        },
        
        resetModal() {
            this.id = null;
            this.bankName = '';
            this.bankBranchName = '';
            this.accountId = '';
            this.accountNo = '';
            this.accountType = '';
            this.currencyId = '';
            this.address = '';
            this.location = '';
            this.contactPerson = '';
            this.contactNo = '';
            this.chequeBookStart = '';
            this.chequeBookEnd = '';
            
            this.modalTitle = `Add ${this.setupEntityName}`;
            $("#setupModal").modal('show');
        }
    },
    mounted() {
        this.getCurrencies();
        this.getAccountDetails();
    }
}).mount("#app");
