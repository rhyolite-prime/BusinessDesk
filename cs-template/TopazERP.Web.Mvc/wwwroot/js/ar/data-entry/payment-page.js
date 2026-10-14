const app = Vue.createApp({
    data() {
        return {
            payments: [],
            searchQuery: '',
            sortKey: '',
            sortAsc: true,
            perPage: 10,
            currentPage: 1,
            expandedPayments: [],
            records: [],
            selectedPayments: [],
            selectAll: false,
            showDropdown: false,
            confirmIds: [],
            modalMessage: "",
            isLoading: false,
            reportApiBaseUrl: '',
            showReportOverlay: false,
            reportData: [],
            expandedPaymentYears: [],
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1777914131/erp-reports/ap/paymentReceiptsBulk_b9iriw.rdl',

        };
    },
    computed: {
        filteredPayments() {
            let list = this.payments;
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(p =>
                    (p.batchNumber && p.batchNumber.toLowerCase().includes(q)) ||
                    (p.customerName && p.customerName.toLowerCase().includes(q))
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
        paginatedPayments() {
            const start = (this.currentPage - 1) * this.perPage;
            return this.filteredPayments.slice(start, start + this.perPage);
        },
        totalPages() {
            return Math.ceil(this.filteredPayments.length / this.perPage) || 1;
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
        groupedPayments() {

            let list = [...this.filteredPayments];

            // SORT INDIVIDUAL PAYMENTS
            if (this.sortKey) {

                list.sort((a, b) => {

                    let valA = a[this.sortKey];
                    let valB = b[this.sortKey];

                    // HANDLE DATES
                    if (this.sortKey.toLowerCase().includes('date')) {

                        valA = valA
                            ? new Date(valA)
                            : new Date(0);

                        valB = valB
                            ? new Date(valB)
                            : new Date(0);
                    }

                    // HANDLE STRINGS
                    else if (typeof valA === 'string') {

                        valA = valA.toLowerCase();
                        valB = valB.toLowerCase();
                    }

                    // HANDLE NULLS
                    if (valA == null) valA = '';
                    if (valB == null) valB = '';

                    if (valA < valB)
                        return this.sortAsc ? -1 : 1;

                    if (valA > valB)
                        return this.sortAsc ? 1 : -1;

                    return 0;
                });
            }

            // PAGINATION
            const start = (this.currentPage - 1) * this.perPage;

            const paginated = list.slice(
                start,
                start + this.perPage
            );

            // GROUP BY YEAR
            const groups = {};

            paginated.forEach(p => {

                const year = p.paymentDate
                    ? new Date(p.paymentDate).getFullYear()
                    : 'No Year';

                if (!groups[year]) {
                    groups[year] = [];
                }

                groups[year].push(p);
            });

            // SORT YEARS
            const sortedGroups = {};

            Object.keys(groups)
                .sort((a, b) =>
                    this.sortAsc
                        ? b - a
                        : a - b
                )
                .forEach(year => {

                    sortedGroups[year] = groups[year];
                });

            return sortedGroups;
        },
    },
    methods: {
        togglePaymentYear(year) {

            const index = this.expandedPaymentYears.indexOf(year);

            if (index > -1) {
                this.expandedPaymentYears.splice(index, 1);
            } else {
                this.expandedPaymentYears.push(year);
            }
        },
        selectFromDropdown(batchNumber) {
            this.searchQuery = batchNumber;
            this.showDropdown = false;
            this.currentPage = 1;
        },

        hideDropdown() {
            setTimeout(() => this.showDropdown = false, 200);
        },
        toggleSelectAll() {
            if (this.selectAll) {
                this.selectedPayments = this.paginatedPayments.map(p => p.id);
            } else {
                this.selectedPayments = [];
            }
        },

        cancelSingle(id) {
            this.openConfirmModal([id]);
        },


        cancelSelected() {
            if (this.selectedPayments.length === 0) {
                toastr.info("No payments selected");
                return;
            }
            this.openConfirmModal(this.selectedPayments);
        },
        openConfirmModal(ids) {
            this.confirmIds = ids;

            if (ids.length === 1) {
                this.modalMessage = "Are you sure you want to cancel this payment?";
            } else {
                this.modalMessage = `Are you sure you want to cancel ${ids.length} selected payments?`;
            }

            $('#cancelModal').modal('show');
        },

        confirmCancel() {
            axios.post('/ArDataEntry/CancelPayment', { paymentIds: this.confirmIds })
                .then((res) => {
                    if (res.data && res.data.success === false) {
                        toastr.error(res.data.message || "Not allowed");
                        return;
                    }

                    this.payments.forEach(p => {
                        if (this.confirmIds.includes(p.id)) {
                            p.isCanceled = true;
                        }
                    });

                    this.selectedPayments = [];
                    this.selectAll = false;

                    $('#cancelModal').modal('hide');
                    toastr.success("Payment(s) canceled successfully");

                    this.fetchPayments();
                })
                .catch(err => {
                    toastr.error("Failed to cancel payments");
                });
        },

        togglePayment(id) {
            const index = this.expandedPayments.indexOf(id);
            if (index >= 0) this.expandedPayments.splice(index, 1);
            else this.expandedPayments.push(id);
        },

        fetchPayments() {
            return axios.get('/ArDataEntry/GetInvoicePayments')
                .then(res => {
                    this.payments = res.data
                        .filter(p => p.isCanceled === false)
                        .sort((a, b) => (a.batchNumber || '').localeCompare(b.batchNumber || ''));
                })
                .catch(err => {
                    console.error(err);
                    toastr.error('Failed to load payments');
                });
        },

        fetchPaymentRecords(){
            return axios.get('/ArDataEntry/GetPaymentRecords')
                .then(res => {
                    // Expect records to have: paymentId, invoiceId, convertedAmount
                    this.records = res.data || [];
                })
                .catch(err => {
                    console.error(err);
                    toastr.error('Failed to load payment records');
                });
        },

        // returns numeric applied amount for given paymentId + invoiceId (convertedAmount from records)
        amountToApplyFor(paymentId, invoiceId) {
            if (!this.records || this.records.length === 0) return 0;
            const rec = this.records.find(r => {
                // handle GUIDs/strings consistently
                return String(r.paymentId).toLowerCase() === String(paymentId).toLowerCase()
                    && String(r.invoiceId).toLowerCase() === String(invoiceId).toLowerCase();
            });
            if (!rec) return 0;
            const v = parseFloat(rec.convertedAmount ?? rec.amount ?? 0);
            return isNaN(v) ? 0 : v;
        },

        // compute new balance = existing balance - applied amount
        newBalanceFor(paymentId, inv) {
            const existingBalance = parseFloat(inv.balance ?? (inv.totalInvoiceAmount - inv.paidAmount) ?? 0);
            const applied = this.amountToApplyFor(paymentId, inv.id);
            const nb = existingBalance - applied;
            // avoid negative balances (if you prefer to show negative, remove Math.max)
            return nb < 0 ? 0 : nb;
        },

        deletePayment(id)
        {
            axios.post('/ArDataEntry/DeleteInvoicePayment?id=' + id)
                .then(response => {
                    this.payments = this.payments.filter(p => p.id !== id);
                    toastr.success('Payment deleted successfully');
                    this.fetchPayments();
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to delete invoice.');
                });
        },
        editPayment(id) {
            window.location.href = `/ArDataEntry/EditPayment?id=${id}`;
        },
        printReport(id) {
            this.isLoading = true;

            // Open a new window and display a yellow spinner
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`
        <html>
        <head>
            <title>Loading Report...</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #fff;
                    font-family: Arial, sans-serif;
                }
                .loader {
                    border: 10px solid #f3f3f3;
                    border-top: 10px solid #facc15;
                    border-radius: 50%;
                    width: 60px;
                    height: 60px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="loader"></div>
        </body>
        </html>
    `);
            printWindow.document.close();

            let url = `/ArReports/GetReceiptInPdf?id=${id}`;

            axios.get(url, { responseType: 'blob' })
                .then(response => {
                    if (!response.data) {
                        this.toastHandler("warning", "No Data is selected for printing.");
                        printWindow.close();
                        this.isLoading = false;
                        return;
                    }

                    const blob = new Blob([response.data], { type: "application/pdf" });
                    const blobUrl = URL.createObjectURL(blob);

                    printWindow.location.href = blobUrl;
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler("error", "Unable to load the invoice payments. Please try again.");
                    printWindow.close();
                    this.isLoading = false;
                });
        },
        sort(key) {
            if (this.sortKey === key) this.sortAsc = !this.sortAsc;
            else { this.sortKey = key; this.sortAsc = true; }
        },

        // small formatter for display
        formatNumber(v) {
            const n = parseFloat(v ?? 0);
            if (isNaN(n)) return '-';
            return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        async printSelected() {

            this.isLoading = true;

            const {PDFDocument} = PDFLib;

            const mergedPdf = await PDFDocument.create();

            // 👇 decide what to print
            let paymentToPrint = [];

            if (this.selectedPayments && this.selectedPayments.length > 0) {
                // ✅ print only selected
                paymentToPrint = this.payments.filter(s =>
                    this.selectedPayments.includes(s.id)
                );
            } else {
                // ✅ fallback to all (excluding ALL option)
                paymentToPrint = this.paymentList.filter(p => p.id !== 'ALL');
            }

            //  safety check
            if (paymentToPrint.length === 0) {
                this.toastHandler('warning', 'No payments to print.');
                this.isLoading = false;
                return;
            }

            // 👇 loop through chosen payments
            for (let payment of paymentToPrint) {

                const response = await axios.get('/ArReports/GetReceiptInPdf', {
                    params: {id: payment.id},
                    responseType: 'arraybuffer'
                });

                const pdf = await PDFDocument.load(response.data);

                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(p => mergedPdf.addPage(p));
            }

            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes], {type: 'application/pdf'});
            const url = URL.createObjectURL(blob);

            // ✅ safer than iframe (avoids Chrome block issues)
            window.open(url, '_blank');

            this.isLoading = false;

            this.toastHandler(
                'success',
                this.selectedPayments.length > 0
                    ? 'Selected payments ready.'
                    : 'All receipts ready.'
            );
        },
    },
    mounted() {
        // Fetch both payments and records, then the UI will use records to show amountToApply
        Promise.all([ this.fetchPayments(), this.fetchPaymentRecords() ])
            .catch(() => {
                // errors are handled in each fetch
            });
        this.reportApiBaseUrl = reportApiBaseUrl;
    }
});
app.mount('#paymentApp');