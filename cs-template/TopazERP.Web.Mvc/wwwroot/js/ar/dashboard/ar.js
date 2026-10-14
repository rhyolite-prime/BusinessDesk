const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            transactionDate: '',
            invoiceChartInstance: null,
            customerChartInstance: null,
            invoiceAnalysisChartData: {
                labels: [],
                data: [],
                colors: []
            },
            customerPaymentsChartData: {
                labels: [],
                balance: [],
                paid: []
            },
            customerBalances: [],
            customerInvoices: [],
            customerPayments: [],
            currentPage: 1,
            currentBPage: 1,
            bItemsPerPage: 3,
            itemsPerPage: 3,
            sortKey: '',
            sortOrder: 'asc',
            bSortKey: '',
            customerCount: 0,
            invoiceCount: 0,
            paymentCount: 0,
            postedInvoiceCount: 0,
        }
    },
    computed: {
        sortedBalances() {
            if (!this.bSortKey) return this.customerBalances;
            return [...this.customerBalances].sort((a, b) => {
                const valueA = a[this.bSortKey];
                const valueB = b[this.bSortKey];
                if (valueA < valueB) return this.sortOrder === 'asc' ? -1 : 1;
                if (valueA > valueB) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        },
        paginatedBalances() {
            const start = (this.currentBPage - 1) * this.bItemsPerPage;
            const end = this.currentBPage * this.bItemsPerPage;
            return this.sortedBalances.slice(start, end);
        },

        sortedInvoices() {
            if (!this.sortKey) return this.customerInvoices;
            return [...this.customerInvoices].sort((a, b) => {
                const valueA = a[this.sortKey];
                const valueB = b[this.sortKey];
                if (valueA < valueB) return this.sortOrder === 'asc' ? -1 : 1;
                if (valueA > valueB) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        },
        paginatedInvoices() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.sortedInvoices.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.customerInvoices.length / this.itemsPerPage);
        },

        totalBPages() {
            return Math.ceil(this.customerBalances.length / this.itemsPerPage);
        }

    },
    methods: {
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

            let url = `/ArReports/GetInvoiceInPdf?id=${id}`;

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
                    this.toastHandler("error", "Unable to load the invoice. Please try again.");
                    printWindow.close();
                    this.isLoading = false;
                });
        },
        getDashboardData() {
            axios.get('/Dashboard/GetArDashboardData')
                .then(response => {

                    // -----------------------------
                    // 1. INVOICE ANALYSIS DATA
                    // -----------------------------
                    const invoiceData =
                        response.data.invoiceAnalysis?.InvoiceAnalysis?.[0] || {};
                    // Build Chart.js-friendly structure
                    this.invoiceAnalysisChartData.labels = [
                        'Unpaid',
                        'Part Paid',
                        'Fully Paid',
                        'Approved',
                        'Pending Approval'
                    ];

                    this.invoiceAnalysisChartData.data = [
                        invoiceData.unpaidCount || 0,
                        invoiceData.partialCount || 0,
                        invoiceData.fullyPaidCount || 0,
                        invoiceData.approvedCount || 0,
                        invoiceData.unapprovedCount || 0
                    ];

                    this.invoiceAnalysisChartData.colors = [
                        '#FF4E42',
                        '#FFB547',
                        '#00E396',
                        '#1f9aff',
                        '#8884d8'
                    ];

                    // -----------------------------
                    // 2. Customer DATA
                    // -----------------------------
                    this.customerBalances =
                        response.data.customerOpeningBalance?.customerOpeningBalances || [];

                    this.customerInvoices =
                        response.data.customerInvoices?.customerInvoices || [];

                    this.customerPayments =
                        response.data.customerPayments?.CustomerPayments || [];

                    // dashboard counts
                    this.customerCount = response.data.calculations?.activeCustomers || 0;
                    this.invoiceCount = response.data.calculations?.TotalInvoices || 0;
                    this.postedInvoiceCount = response.data.calculations?.PostedInvoices || 0;
                    this.paymentCount = response.data.calculations?.PostedPayments || 0;

                    // -----------------------------
                    // 3. Customer PAYMENTS CHART DATA
                    // -----------------------------
                    const customers = [];
                    const totalPaid = [];
                    const invoiceBalance = [];

                    (this.customerPayments || []).forEach(v => {
                        customers.push(v.customerName);
                        totalPaid.push(v.totalPaid || 0);
                        invoiceBalance.push(v.invoiceBalance || 0);
                    });

                    this.customerPaymentsChartData.labels = customers;
                    this.customerPaymentsChartData.paid = totalPaid;
                    this.customerPaymentsChartData.balance = invoiceBalance;

                    // -----------------------------
                    // 4. RENDER CHARTS SAFELY
                    // (wait until DOM is ready)
                    // -----------------------------
                    this.$nextTick(() => {
                        this.renderInvoiceChart();
                        this.renderCustomerChart();
                    });

                })
                .catch(err => {
                    console.error(err);
                    this.toastHandler('error', 'Unable to retrieve dashboard data.');
                });
        },

        renderInvoiceChart() {
            const ctx = document.getElementById('invoiceChart');

            if (this.invoiceChartInstance) {
                this.invoiceChartInstance.destroy();
            }

            this.invoiceChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: this.invoiceAnalysisChartData.labels,
                    datasets: [{
                        data: this.invoiceAnalysisChartData.data,
                        backgroundColor: this.invoiceAnalysisChartData.colors
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        },
        renderCustomerChart() {
            const ctx = document.getElementById('customerChart');

            if (this.customerChartInstance) {
                this.customerChartInstance.destroy();
            }

            this.customerChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: this.customerPaymentsChartData.labels,
                    datasets: [
                        {
                            label: 'Balance Due',
                            data: this.customerPaymentsChartData.balance
                        },
                        {
                            label: 'Amount Paid',
                            data: this.customerPaymentsChartData.paid
                        }
                    ]
                },
                options: {
                    responsive: true
                }
            });
        },
       /* getDashboardData() {
            axios.get('/Dashboard/GetArDashboardData').then(response => {
                const invoiceData = response.data.invoiceAnalysis.InvoiceAnalysis[0];

                this.invoiceAnalysisChartData.series = [
                    invoiceData.unpaidCount,
                    invoiceData.partialCount,
                    invoiceData.fullyPaidCount,
                    invoiceData.approvedCount,
                    invoiceData.unapprovedCount
                ];
                this.invoiceAnalysisChartData.chartOptions = {
                    labels: ['Unpaid', 'Part Paid', 'Fully Paid', 'Approved', 'Pending Approval'],
                    colors: ['#FF4E42', '#FFB547', '#00E396', '#1f9aff', '#8884d8'],
                    chart: { width: 380, type: 'donut', redrawOnParentResize: false },
                    dataLabels: { enabled: true },
                    legend: { position: 'right' },
                    responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { show: true } } }]
                };
                this.customerBalances = response.data.customerOpeningBalance.customerOpeningBalances;
                this.customerInvoices = response.data.customerInvoices.customerInvoices;
                this.customerPayments = response.data.customerPayments.CustomerPayments;
                this.customerCount = response.data.calculations?.activeCustomers || 0;
                this.invoiceCount = response.data.calculations?.TotalInvoices || 0;
                this.postedInvoiceCount = response.data.calculations?.PostedInvoices || 0;
                this.paymentCount = response.data.calculations?.PostedPayments || 0;
                let customers = [];
                let totalPaid = [];
                let invoicebalance = [];
                let seriesList = [];

                this.customerPayments.forEach((v) => {
                    customers.push(v.customerName);
                    totalPaid.push(v.totalPaid);
                    invoicebalance.push(v.invoiceBalance);
                });

                seriesList.push({ name: 'Balance Due', data: invoicebalance });
                seriesList.push({ name: 'Amount Paid', data: totalPaid });



                this.customerPaymentsChartData.series = seriesList;
                this.customerPaymentsChartData.chartOptions = {
                    xaxis: {

                        categories: customers,
                    }
                };
            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve dashboard data.');

            });
        },*/
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
        sortBTable(key) {
            if (this.bSortKey === key) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.bSortKey = key;
                this.sortOrder = 'asc';
            }
        },
        nextBPage() {
            if (this.currentBPage < this.totalBPages) this.currentBPage++;
        },
        prevBPage() {
            if (this.currentBPage > 1) this.currentBPage--;
        },
        sortTable(key) {
            if (this.sortKey === key) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortKey = key;
                this.sortOrder = 'asc';
            }
        },
        nextPage() {
            if (this.currentPage < this.totalPages) this.currentPage++;
        },
        prevPage() {
            if (this.currentPage > 1) this.currentPage--;
        },

    },

    mounted() {

        this.getDashboardData();

    },

});
app.mount('#app');