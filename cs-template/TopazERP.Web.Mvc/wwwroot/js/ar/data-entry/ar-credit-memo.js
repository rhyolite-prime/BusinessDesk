const app = Vue.createApp({
    data() {
        return {
            creditMemos: [],
            searchQuery: '',
            sortKey: '',
            sortAsc: true,
            perPage: 10,
            currentPage: 1,
            showDropdown: false,
            modalDeleteId: null,
            modalTitle: "",
            modalMessage: "",
        };
    },

    computed: {
        filteredCreditMemos() {
            let list = this.creditMemos;

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(c =>
                    (c.batchNumber && c.batchNumber.toLowerCase().includes(q)) ||
                    (c.customerName && c.customerName.toLowerCase().includes(q)) ||
                    (c.invoiceNo && c.invoiceNo.toLowerCase().includes(q))
                );
            }

            if (this.sortKey) {
                list.sort((a, b) => {
                    let valA = a[this.sortKey] ?? '';
                    let valB = b[this.sortKey] ?? '';

                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();

                    if (valA < valB) return this.sortAsc ? -1 : 1;
                    if (valA > valB) return this.sortAsc ? 1 : -1;
                    return 0;
                });
            }

            return list;
        },

        paginatedCreditMemos() {
            const start = (this.currentPage - 1) * this.perPage;
            return this.filteredCreditMemos.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.filteredCreditMemos.length / this.perPage) || 1;
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
        },
    },

    methods: {
        selectFromDropdown(batchNumber) {
            this.searchQuery = batchNumber;
            this.showDropdown = false;
            this.currentPage = 1;
        },

        hideDropdown() {
            setTimeout(() => this.showDropdown = false, 200);
        },
        fetchCreditMemos() {
            axios.get('/ArDataEntry/GetCreditMemo')
                .then(res => {
                    this.creditMemos = res.data || [];
                })
                .catch(err => {
                    console.error(err);
                    toastr.error('Failed to load credit memos');
                });
        },

        deleteCreditMemo(id) {
            this.openConfirmDelete(id);
        },
        openConfirmDelete(id) {
            this.modalDeleteId = id;
            this.modalTitle = "Delete Credit Memo";
            this.modalMessage = "Are you sure you want to delete this credit memo?";
            $("#creditMemoDeleteModal").modal("show");
        },
        confirmDelete() {
            $("#creditMemoDeleteModal").modal("hide");

            axios.get('/ArDataEntry/DeleteCreditMemo/?id=' + this.modalDeleteId)
                .then(() => {
                    this.creditMemos = this.creditMemos.filter(d => d.id !== this.modalDeleteId);
                    toastr.success("Credit memo deleted successfully");
                })
                .catch(() => toastr.error("Failed to delete credit memo"));
        },
        editCreditMemo(id) {
            window.location.href = `/ArDataEntry/EditMemo?id=${id}`;
        },

        applyCreditMemo(id) {
            window.location.href = `/ArDataEntry/ApplyCreditMemo?id=${id}`;
        },

        sort(key) {
            if (this.sortKey === key)
                this.sortAsc = !this.sortAsc;
            else {
                this.sortKey = key;
                this.sortAsc = true;
            }
        },

        formatNumber(v) {
            const n = parseFloat(v ?? 0);
            if (isNaN(n)) return '-';
            return n.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    },

    mounted() {
        this.fetchCreditMemos();
    }
});
app.mount('#creditMemoApp');
