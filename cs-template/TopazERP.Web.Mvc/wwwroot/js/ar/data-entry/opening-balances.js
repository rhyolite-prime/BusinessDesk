const app = Vue.createApp ({
    data() {
        return {
            balances: [],
            searchQuery: '',
            expanded: [],
            currentPage: 1,
            perPage: 10,
            status: 'all',
            showDropdown: false,
            modalDeleteId: null,
            modalTitle: "",
            modalMessage: "",
        };
    },

    computed: {
        groupedBalances() {
            const groups = {};

            this.balances.forEach(b => {
                if (!groups[b.customerId]) groups[b.customerId] = [];
                groups[b.customerId].push(b);
            });

            return groups;
        },

        filteredCustomers() {  
            const groups = this.groupedBalances;

            if (!this.searchQuery) return groups;

            const q = this.searchQuery.toLowerCase();
            const filtered = {};

            Object.keys(groups).forEach(customerId => {
                if (groups[customerId][0].customerName.toLowerCase().includes(q)) {
                    filtered[customerId] = groups[customerId];
                }
            });

            return filtered;
        },

        paginatedCustomers() {
            const customerIds = Object.keys(this.filteredCustomers);
            const start = (this.currentPage - 1) * this.perPage;
            const paginatedIds = customerIds.slice(start, start + this.perPage);

            const result = {};
            paginatedIds.forEach(id => result[id] = this.filteredCustomers[id]);
            return result;
        },

        totalPages() {
            return Math.ceil(Object.keys(this.filteredCustomers).length / this.perPage) || 1;
        },
        paginationPages() {
            const total = this.totalPages;
            const current = this.currentPage;
            const delta = 2; // how many pages around current

            const range = [];
            const rangeWithDots = [];

            let l;

            for (let i = 1; i <= total; i++) {
                if (
                    i === 1 ||
                    i === total ||
                    (i >= current - delta && i <= current + delta)
                ) {
                    range.push(i);
                }
            }

            for (let i of range) {
                if (l) {
                    if (i - l === 2) {
                        rangeWithDots.push(l + 1);
                    } else if (i - l > 2) {
                        rangeWithDots.push('...');
                    }
                }
                rangeWithDots.push(i);
                l = i;
            }

            return rangeWithDots;
        }
    },

    methods: {
        selectFromDropdown(customerName) {
            this.searchQuery = customerName;
            this.showDropdown = false;
            this.currentPage = 1;
        },

        hideDropdown() {
            setTimeout(() => this.showDropdown = false, 200);
        },
        fetchBalances() {
            axios.get('/ArDataEntry/GetOpeningBalances')
                .then(res => {
                    this.balances = res.data;
                })
                .catch(() => toastr.error('Failed to load balances'));
        },

        toggleCustomer(id) { 
            const index = this.expanded.indexOf(id);
            if (index >= 0) this.expanded.splice(index, 1);
            else this.expanded.push(id);
        },

        sumAmount(items) {
            return items.reduce((t, x) => t + (x.amount || 0), 0);
        },

        deleteBalance(id) {
            this.openConfirmDelete(id);
        },

        printReport(customerId, status) {
            status = this.status;
            const url = `/ArReports/PrintOpeningBalance?customerId=${customerId}&status=${status}`;
            window.open(url, "_blank");
        },

        editBalance(id) {
            window.location.href = `/ArDataEntry/EditBalance?id=${id}`;
        },

        postBalances() {
            axios.post('/ArDataEntry/InitPostArBalances/')
                .then(() => {
                    toastr.success('Opening balances posted');
                    this.fetchBalances();
                })
                .catch(() => toastr.error('Posting failed'));
        },

        formatNumber(n) {
            const x = parseFloat(n ?? 0);
            return isNaN(x)
                ? "-"
                : x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        openConfirmDelete(id) {
            this.modalDeleteId = id;
            this.modalTitle = "Confirm Delete";
            this.modalMessage = "Are you sure you want to delete this opening balance entry?";
            $("#deleteConfirmModal").modal("show");
        },
        confirmDelete() {
            $("#deleteConfirmModal").modal("hide");

            axios.post('/ArDataEntry/DeleteOpeningBalances?id=' + this.modalDeleteId)
                .then(() => {
                    this.balances = this.balances.filter(x => x.id !== this.modalDeleteId);
                    toastr.success('Balance deleted');
                })
                .catch(() => toastr.error('Unable to delete balance'));
        }

    },

    mounted() {
        this.fetchBalances();
    }
});
app.mount('#openingBalanceApp');