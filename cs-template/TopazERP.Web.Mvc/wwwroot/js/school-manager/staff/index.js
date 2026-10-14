const app = Vue.createApp({
    data() {
        return {
            staffList: [],
            searchQuery: '',
            sortKey: '',
            sortAsc: true,
            currentPage: 1,
            perPage: 10,
            selectedStaff: null,
            showStaffModal: false,
        }
    },
    computed: {
        filteredData() {
            let data = this.staffList;

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                data = data.filter(s =>
                    (s.firstName && s.firstName.toLowerCase().includes(q)) ||
                    (s.lastName && s.lastName.toLowerCase().includes(q)) ||
                    (s.staffIdentifier && s.staffIdentifier.toLowerCase().includes(q))
                );
            }

            if (this.sortKey) {
                data.sort((a, b) => {
                    const valA = a[this.sortKey] || '';
                    const valB = b[this.sortKey] || '';
                    if (this.sortAsc) return valA > valB ? 1 : -1;
                    else return valA < valB ? 1 : -1;
                });
            }

            return data;
        },
        totalPages() {
            return Math.ceil(this.filteredData.length / this.perPage);
        },
        paginatedData() {
            const start = (this.currentPage - 1) * this.perPage;
            return this.filteredData.slice(start, start + this.perPage);
        },
        visiblePages() {

            const pages = [];

            // show all if pages are small
            if (this.totalPages <= 3) {

                for (let i = 1; i <= this.totalPages; i++) {
                    pages.push(i);
                }

                return pages;
            }

            // first page
            pages.push(1);

            // left dots
            if (this.currentPage > 3) {
                pages.push('...');
            }

            // middle pages
            let start = Math.max(2, this.currentPage - 1);
            let end = Math.min(this.totalPages - 1, this.currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // right dots
            if (this.currentPage < this.totalPages - 2) {
                pages.push('...');
            }

            // last page
            pages.push(this.totalPages);

            return [...new Set(pages)];
        },
    },
    methods: {
        viewStaff(staff) {
            this.selectedStaff = staff;
            this.showStaffModal = true;
        },
        closeModal() {
            this.showStaffModal = false;
            this.selectedStaff = null;
        },
        getStaffList() {
            axios.get('/SmStaffSetups/ListAllStaffBios').then(res => {
                this.staffList = res.data;
                // get full name for each staff
                this.staffList.forEach(s => {
                    s.fullName = [s.firstName, s.otherName, s.lastName].filter(n => n).join(' ');
                });
            }).catch(() => {
                this.toastHandler('error', 'Unable to load staff data.');
            });
        },
        deleteStaff(id) {
            axios.get('/SmStaffSetups/DeleteStaffBio?id=' + id).then(() => {
                this.getStaffList();
                this.toastHandler('', 'Staff deleted successfully.');
            }).catch(() => this.toastHandler('error', 'Unable to delete staff.'));
        },
        sortBy(key) {
            if (this.sortKey === key) this.sortAsc = !this.sortAsc;
            else {
                this.sortKey = key;
                this.sortAsc = true;
            }
        },
        changePage(page) {
            if (page < 1 || page > this.totalPages) return;
            this.currentPage = page;
        },
        toastHandler(type, message) {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 4000 };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        },
        formatDate(date) {
            return date ? moment(date).format("DD-MMM-YYYY") : '';
        }
    },
    created() {
        this.getStaffList();
    }
});
app.mount('#app');
