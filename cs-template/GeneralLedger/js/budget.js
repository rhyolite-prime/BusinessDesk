    const { createApp } = Vue;
createApp({
    data() {
        return {
            isLoading: false,
            id: null,
            modalTitle: 'Add Budget',
            setupEntityName: 'Budget',
            showSetupModal: false,
            
            // Form fields matching Budget.cshtml v-models
            accountId: '',
            organizationalUnitId: '',
            beginningMonth: 'January',
            beginningYear: new Date().getFullYear(),
            endingMonth: 'December',
            endingYear: new Date().getFullYear(),
            budgetAmountOption: 1,
            allocationMethod: 1,
            budgetToAdd: 1,
            
            // Lookup data for the dropdowns (to be populated from backend if needed)
            accounts: [],
            orgUnits: []
        }
    },
    methods: {
        initDeleteSetup(id) {
            this.id = id;
            $("#deleteModal").modal('show');
        },

        deleteSetup() {
            this.isLoading = true;
            axios.get('/GeneralLedger/DeleteBudget/?id=' + this.id).then((response) => {
                location.reload();
            }).catch((error) => {
                console.log(error);
                this.isLoading = false;
            });
        },

        addSetup() {
            this.isLoading = true;

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            
            let beginMonthIndex = monthNames.indexOf(this.beginningMonth);
            let endMonthIndex = monthNames.indexOf(this.endingMonth);
            
            // Default to day 1 for the start date, and day 1 of the end month
            let beginDate = new Date(this.beginningYear, Math.max(0, beginMonthIndex), 1);
            let endDate = new Date(this.endingYear, Math.max(0, endMonthIndex), 1);
            
            // Using local time formatting to avoid timezone shifts sending the wrong date string
            const formatDate = (date) => {
                let d = new Date(date),
                    month = '' + (d.getMonth() + 1),
                    day = '' + d.getDate(),
                    year = d.getFullYear();
                if (month.length < 2) month = '0' + month;
                if (day.length < 2) day = '0' + day;
                return [year, month, day].join('-');
            };

            let payload = {
                accountId: this.accountId,
                ouId: this.organizationalUnitId,
                beginDate: formatDate(beginDate),
                endDate: formatDate(endDate),
                budgetDetails: []
            };

            if (this.id) {
                payload.id = this.id;
                axios.post('/GeneralLedger/UpdateBudget/', payload).then((response) => {
                    location.reload();
                }).catch((error) => {
                    console.log(error);
                    this.isLoading = false;
                });
            } else {
                axios.post('/GeneralLedger/CreateBudget/', payload).then((response) => {
                    location.reload();
                }).catch((error) => {
                    console.log(error);
                    this.isLoading = false;
                });
            }
        },

        viewSetupDetails(budget) {
            this.id = budget.Id;
            this.accountId = budget.AccountId;
            this.organizationalUnitId = budget.OuId;
            
            if (budget.BeginDate) {
                // Split YYYY-MM-DD
                let parts = budget.BeginDate.split('-');
                if(parts.length === 3) {
                    let d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                    this.beginningMonth = d.toLocaleString('default', { month: 'long' });
                    this.beginningYear = d.getFullYear();
                }
            }
            
            if (budget.EndDate) {
                let parts = budget.EndDate.split('-');
                if(parts.length === 3) {
                    let d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                    this.endingMonth = d.toLocaleString('default', { month: 'long' });
                    this.endingYear = d.getFullYear();
                }
            }
            
            // The API doesn't return these anymore, reset to defaults or keep them as is
            this.budgetAmountOption = 1;
            this.allocationMethod = 1;
            this.budgetToAdd = 1;

            this.modalTitle = `Edit ${this.setupEntityName}`;
            this.showSetupModal = true;
            $("#setupModal").modal('show');
        },
        
        resetModal() {
            this.id = null;
            this.accountId = '';
            this.organizationalUnitId = '';
            this.beginningMonth = 'January';
            this.beginningYear = new Date().getFullYear();
            this.endingMonth = 'December';
            this.endingYear = new Date().getFullYear();
            this.budgetAmountOption = 1;
            this.allocationMethod = 1;
            this.budgetToAdd = 1;
            
            this.modalTitle = `Add ${this.setupEntityName}`;
            this.showSetupModal = true;
            $("#setupModal").modal('show');
        }
    },
    mounted() {
        // Here you would typically fetch 'accounts' and 'orgUnits' arrays 
        // if they are not directly populated from Razor into a JS global variable.
    }
}).mount("#app");
