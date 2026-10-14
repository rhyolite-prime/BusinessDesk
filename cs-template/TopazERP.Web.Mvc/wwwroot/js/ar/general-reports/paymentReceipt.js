const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            invoiceId: '',
            reportType: 'summary-report',
            reportApiBaseUrl: '',
            reportPath: '',
            pdfUrl: '',
            paymentId: '',
            paymentList: [],
            paymentInvoiceList: [],
            paymentInvoiceDetailsMap: {},
            summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1745323121/erp-reports/ar/paymentReceiptUpdated_ddqlmg.rdl',
            reportHeader: [],
            reportDetails: [],
            customerInfo: [],
            paymentDetails: [],
            referenceNumber: '',
            selectedPayments: [],
            selectAll: false,
            showDropdown: false,
            modalActionType: "",
            modalPaymentId: null,
            modalTitle: "",
            modalMessage: "",
            modalBulkIds: [],
            searchQuery: '',
            sortKey: '',
            sortAsc: true,
            perPage: 10,
            currentPage: 1,
            expanded: [],
            
        }
        },
    computed: {
        filteredPayments() {
            let list = this.paymentList.filter(i => i.id !== 'ALL');

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(i =>
                    (i.batchNumber && i.batchNumber.toLowerCase().includes(q)) ||
                    (i.customerName && i.customerName.toLowerCase().includes(q)) ||
                    (i.isPosted && i.isPosted.toString().toLowerCase().includes(q))
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
        isAllSelected() {
            return this.paymentList.length > 0 &&
                this.selectedPayment.length === this.paymentList.filter(i => i.id !== 'ALL').length;
        },
        paginatedPayments() {
            const start = (this.currentPage - 1) * this.perPage;
            return this.filteredPayments.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.filteredPayments.length / this.perPage) || 1;
        },
        selectedPayment() {
            if (this.selectedPayments.length === 1)
                return this.payments.find(i => i.id === this.selectedPayments[0]);
            return null;
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
        formatNumber(v) {
            const n = parseFloat(v ?? 0);
            return isNaN(n)
                ? '-'
                : n.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
        },
        toggleSelectAll() {
            if (this.selectAll) {
                // select all (exclude ALL option if present)
                this.selectedPayments = this.paymentList
                    .filter(i => i.id !== 'ALL')
                    .map(i => i.id);
            } else {
                this.selectedPayments = [];
            }
        },
        sort(key) {
            if (this.sortKey === key) this.sortAsc = !this.sortAsc;
            else { this.sortKey = key; this.sortAsc = true; }
        },
        togglePayment(id) { 
            const i = this.expanded.indexOf(id);
            if (i >= 0) this.expanded.splice(i, 1);
            else this.expanded.push(id);
        },
        getPayments() {
            axios.get('/ArDataEntry/GetInvoicePayments')
                .then(response => {
                    this.paymentList = response.data.filter(p => p.isCanceled === false);
                    const allOption = {
                        id: 'ALL',
                        batchNumber: 'ALL',
                        customerName: '',
                        displayName: 'All Payments',
                    };
                    this.paymentList.forEach(payment => {
                        payment.displayName = `${payment.customerName} - ${payment.batchNumber}`;
                    });
                    this.paymentList = [allOption, ...this.paymentList];

                    this.paymentId = 'ALL';
                    
                    $("#paymentId").ejDropDownList({
                        dataSource: this.paymentList,
                        watermarkText: "Select Payment Batch No.",
                        width: "100%",
                        fields: { id: "id", text: "displayName", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.paymentId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get payments.');
                });
        },
        
        print() {
            if (this.paymentId === 'ALL') {
                this.printAllPayments();
                return;
            }
            
            this.isLoading = true;

            let url = `/ArReports/GetReceiptInPdf?id=${this.paymentId}`;

            axios.get(url, { responseType: 'blob' })
                .then(response => {
                    if (!response.data) {
                        this.toastHandler("warning", "No Data is selected for printing.");
                        this.isLoading = false;
                        return;
                    }

                    const blob = new Blob([response.data], { type: "application/pdf" });
                    const blobUrl = URL.createObjectURL(blob);

                    // Set the PDF url to your iframe
                    this.pdfUrl = blobUrl;

                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler("error", "Unable to load the invoice payments. Please try again.");
                    this.isLoading = false;
                });
        },
        async printAllPayments() {

            this.isLoading = true;

            const { PDFDocument } = PDFLib;

            const mergedPdf = await PDFDocument.create();

            // 👇 decide what to print
            let paymentsToPrint = [];

            if (this.selectedPayments && this.selectedPayments.length > 0) {
                // ✅ print only selected
                paymentsToPrint = this.paymentList.filter(payment =>
                    this.selectedPayments.includes(payment.id)
                );
            } else {
                // ✅ fallback to all (excluding ALL option)
                paymentsToPrint = this.paymentList.filter(payment => payment.id !== 'ALL');
            }

            // 🚨 safety check
            if (paymentsToPrint.length === 0) {
                this.toastHandler('warning', 'No payments to print.');
                this.isLoading = false;
                return;
            }

            // 👇 loop through chosen payments
            for (let payment of paymentsToPrint) {

                const response = await axios.get('/ArReports/GetReceiptInPdf', {
                    params: { id: payment.id },
                    responseType: 'arraybuffer'
                });

                const pdf = await PDFDocument.load(response.data);

                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(p => mergedPdf.addPage(p));
            }

            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // ✅ safer than iframe (avoids Chrome block issues)
            window.open(url, '_blank');

            this.isLoading = false;

            this.toastHandler(
                'success',
                this.selectedPayments.length > 0
                    ? 'Selected payments ready.'
                    : 'All payments ready.'
            );
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
    mounted() {
        this.getPayments();

    },
});
app.mount('#app');