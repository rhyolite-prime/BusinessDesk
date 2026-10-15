
var vue = new Vue({
    el: '#app',
    components: {
        'gl-monthly-trend-chart': VueApexCharts,
        'gl-account-type-chart': VueApexCharts,
        'gl-debit-credit-chart': VueApexCharts,
    },
    data: {
        isLoading: false,
        selectedPeriod: 'This Year',
        periods: ['This Month', 'Last Month', 'This Quarter', 'This Year'],

        // ── KPI Summary Cards ──────────────────────────────────────────
        totalDebits: 4825670.00,
        totalCredits: 4791340.00,
        netBalance: 34330.00,
        totalJournalEntries: 1248,
        postedEntries: 1102,
        unpostedEntries: 146,
        totalAccounts: 312,

        // ── Recent Journal Entries (mock) ──────────────────────────────
        journalEntries: [
            { id: 'JE-2024-001', date: '2024-09-20', description: 'Office Supplies Purchase', account: 'Supplies Expense', debit: 1500.00, credit: 0, status: 'Posted', type: 'Expense' },
            { id: 'JE-2024-002', date: '2024-09-19', description: 'Client Invoice Payment Received', account: 'Accounts Receivable', debit: 0, credit: 18500.00, status: 'Posted', type: 'Revenue' },
            { id: 'JE-2024-003', date: '2024-09-18', description: 'Monthly Rent Expense', account: 'Rent Expense', debit: 8000.00, credit: 0, status: 'Posted', type: 'Expense' },
            { id: 'JE-2024-004', date: '2024-09-17', description: 'Payroll Processing - Sept', account: 'Salaries Payable', debit: 62450.00, credit: 0, status: 'Unposted', type: 'Liability' },
            { id: 'JE-2024-005', date: '2024-09-16', description: 'Equipment Depreciation', account: 'Accumulated Depreciation', debit: 0, credit: 3200.00, status: 'Posted', type: 'Asset' },
            { id: 'JE-2024-006', date: '2024-09-15', description: 'Vendor Payment - Tech Supplies', account: 'Accounts Payable', debit: 0, credit: 9750.00, status: 'Posted', type: 'Liability' },
            { id: 'JE-2024-007', date: '2024-09-14', description: 'Marketing Campaign Spend', account: 'Marketing Expense', debit: 4500.00, credit: 0, status: 'Unposted', type: 'Expense' },
            { id: 'JE-2024-008', date: '2024-09-13', description: 'Tax Withholding Remittance', account: 'Tax Payable', debit: 0, credit: 12300.00, status: 'Posted', type: 'Liability' },
            { id: 'JE-2024-009', date: '2024-09-12', description: 'Bank Interest Income', account: 'Interest Income', debit: 0, credit: 620.50, status: 'Posted', type: 'Revenue' },
            { id: 'JE-2024-010', date: '2024-09-11', description: 'Cash Sales - Retail', account: 'Sales Revenue', debit: 0, credit: 27800.00, status: 'Posted', type: 'Revenue' },
            { id: 'JE-2024-011', date: '2024-09-10', description: 'Insurance Premium Payment', account: 'Prepaid Insurance', debit: 6200.00, credit: 0, status: 'Posted', type: 'Asset' },
            { id: 'JE-2024-012', date: '2024-09-09', description: 'Loan Principal Repayment', account: 'Long-term Loan', debit: 0, credit: 15000.00, status: 'Unposted', type: 'Liability' },
        ],
        journalSearch: '',
        journalCurrentPage: 1,
        journalPageSize: 5,
        journalSortKey: 'date',
        journalSortOrder: 'desc',

        // ── Account Balances (mock trial balance) ─────────────────────
        accountBalances: [
            { code: '1001', name: 'Cash & Cash Equivalents', type: 'Asset', debit: 185000.00, credit: 0, balance: 185000.00 },
            { code: '1100', name: 'Accounts Receivable', type: 'Asset', debit: 94500.00, credit: 12000.00, balance: 82500.00 },
            { code: '1200', name: 'Prepaid Insurance', type: 'Asset', debit: 6200.00, credit: 0, balance: 6200.00 },
            { code: '1500', name: 'Property & Equipment', type: 'Asset', debit: 320000.00, credit: 0, balance: 320000.00 },
            { code: '1510', name: 'Accumulated Depreciation', type: 'Asset', debit: 0, credit: 48000.00, balance: -48000.00 },
            { code: '2001', name: 'Accounts Payable', type: 'Liability', debit: 9750.00, credit: 45600.00, balance: -35850.00 },
            { code: '2100', name: 'Salaries Payable', type: 'Liability', debit: 0, credit: 62450.00, balance: -62450.00 },
            { code: '2200', name: 'Tax Payable', type: 'Liability', debit: 0, credit: 12300.00, balance: -12300.00 },
            { code: '2500', name: 'Long-term Loan', type: 'Liability', debit: 15000.00, credit: 250000.00, balance: -235000.00 },
            { code: '3001', name: 'Share Capital', type: 'Equity', debit: 0, credit: 500000.00, balance: -500000.00 },
            { code: '3100', name: 'Retained Earnings', type: 'Equity', debit: 0, credit: 78000.00, balance: -78000.00 },
            { code: '4001', name: 'Sales Revenue', type: 'Revenue', debit: 0, credit: 425000.00, balance: -425000.00 },
            { code: '4100', name: 'Interest Income', type: 'Revenue', debit: 0, credit: 3200.00, balance: -3200.00 },
            { code: '5001', name: 'Salaries Expense', type: 'Expense', debit: 210000.00, credit: 0, balance: 210000.00 },
            { code: '5100', name: 'Rent Expense', type: 'Expense', debit: 72000.00, credit: 0, balance: 72000.00 },
            { code: '5200', name: 'Marketing Expense', type: 'Expense', debit: 36000.00, credit: 0, balance: 36000.00 },
            { code: '5300', name: 'Supplies Expense', type: 'Expense', debit: 8500.00, credit: 0, balance: 8500.00 },
        ],
        balanceSearch: '',
        balanceCurrentPage: 1,
        balancePageSize: 6,
        balanceSortKey: 'code',
        balanceSortOrder: 'asc',

        // ── ApexCharts: Monthly Debit vs Credit Trend ─────────────────
        glMonthlyTrendChart: {
            series: [
                {
                    name: 'Total Debits',
                    data: [320000, 410000, 380000, 490000, 425000, 510000, 465000, 530000, 482567]
                },
                {
                    name: 'Total Credits',
                    data: [310000, 405000, 370000, 480000, 415000, 498000, 455000, 521000, 479134]
                }
            ],
            chartOptions: {
                chart: {
                    type: 'area',
                    height: 280,
                    toolbar: { show: false },
                    zoom: { enabled: false }
                },
                colors: ['#667eea', '#48bb78'],
                dataLabels: { enabled: false },
                stroke: { curve: 'smooth', width: 2 },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.35,
                        opacityTo: 0.05,
                        stops: [0, 100]
                    }
                },
                xaxis: {
                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                    labels: { style: { colors: '#8a8d95', fontSize: '12px' } }
                },
                yaxis: {
                    labels: {
                        style: { colors: '#8a8d95' },
                        formatter: (val) => 'GHS ' + (val / 1000).toFixed(0) + 'K'
                    }
                },
                tooltip: {
                    y: {
                        formatter: (val) => 'GHS ' + val.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    }
                },
                legend: { position: 'top', horizontalAlign: 'right' },
                grid: { borderColor: '#f0f0f0' }
            }
        },

        // ── ApexCharts: Account Type Distribution (donut) ─────────────
        glAccountTypeChart: {
            series: [393700, 393300, 578000, 328200],
            chartOptions: {
                chart: { type: 'donut', height: 260, redrawOnParentResize: true },
                labels: ['Assets', 'Liabilities', 'Equity + Revenue', 'Expenses'],
                colors: ['#667eea', '#fc8181', '#48bb78', '#f6ad55'],
                dataLabels: { enabled: false },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '65%',
                            labels: {
                                show: true,
                                total: {
                                    show: true,
                                    label: 'Accounts',
                                    formatter: () => '312'
                                }
                            }
                        }
                    }
                },
                legend: { position: 'bottom' },
                responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { show: false } } }]
            }
        },

        // ── ApexCharts: Top Expense Accounts (bar) ────────────────────
        glDebitCreditChart: {
            series: [{ name: 'Balance (GHS)', data: [210000, 72000, 36000, 8500, 3200] }],
            chartOptions: {
                chart: { type: 'bar', height: 260, toolbar: { show: false } },
                colors: ['#667eea'],
                plotOptions: {
                    bar: { borderRadius: 6, horizontal: true, distributed: false }
                },
                dataLabels: {
                    enabled: true,
                    formatter: (val) => 'GHS ' + val.toLocaleString(),
                    style: { fontSize: '11px', colors: ['#fff'] }
                },
                xaxis: {
                    categories: ['Salaries', 'Rent', 'Marketing', 'Supplies', 'Others'],
                    labels: { style: { colors: '#8a8d95' } }
                },
                yaxis: { labels: { style: { colors: '#8a8d95' } } },
                grid: { borderColor: '#f0f0f0' },
                tooltip: {
                    y: { formatter: (val) => 'GHS ' + val.toLocaleString(undefined, { minimumFractionDigits: 2 }) }
                }
            }
        }
    },

    computed: {

        // ── Journal Entry Filtering & Pagination ──────────────────────
        filteredJournalEntries() {
            let entries = this.journalEntries;
            if (this.journalSearch.trim()) {
                const q = this.journalSearch.toLowerCase();
                entries = entries.filter(e =>
                    e.id.toLowerCase().includes(q) ||
                    e.description.toLowerCase().includes(q) ||
                    e.account.toLowerCase().includes(q) ||
                    e.status.toLowerCase().includes(q)
                );
            }
            return entries.slice().sort((a, b) => {
                let aVal = a[this.journalSortKey];
                let bVal = b[this.journalSortKey];
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                if (aVal < bVal) return this.journalSortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.journalSortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        },

        paginatedJournalEntries() {
            const start = (this.journalCurrentPage - 1) * this.journalPageSize;
            return this.filteredJournalEntries.slice(start, start + this.journalPageSize);
        },

        totalJournalPages() {
            return Math.max(1, Math.ceil(this.filteredJournalEntries.length / this.journalPageSize));
        },

        // ── Account Balances Filtering & Pagination ───────────────────
        filteredAccountBalances() {
            let accounts = this.accountBalances;
            if (this.balanceSearch.trim()) {
                const q = this.balanceSearch.toLowerCase();
                accounts = accounts.filter(a =>
                    a.code.toLowerCase().includes(q) ||
                    a.name.toLowerCase().includes(q) ||
                    a.type.toLowerCase().includes(q)
                );
            }
            return accounts.slice().sort((a, b) => {
                let aVal = a[this.balanceSortKey];
                let bVal = b[this.balanceSortKey];
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                if (aVal < bVal) return this.balanceSortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.balanceSortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        },

        paginatedAccountBalances() {
            const start = (this.balanceCurrentPage - 1) * this.balancePageSize;
            return this.filteredAccountBalances.slice(start, start + this.balancePageSize);
        },

        totalBalancePages() {
            return Math.max(1, Math.ceil(this.filteredAccountBalances.length / this.balancePageSize));
        },
    },

    methods: {

        // ── Sorting ───────────────────────────────────────────────────
        sortJournal(key) {
            if (this.journalSortKey === key) {
                this.journalSortOrder = this.journalSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.journalSortKey = key;
                this.journalSortOrder = 'asc';
            }
            this.journalCurrentPage = 1;
        },

        sortBalance(key) {
            if (this.balanceSortKey === key) {
                this.balanceSortOrder = this.balanceSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.balanceSortKey = key;
                this.balanceSortOrder = 'asc';
            }
            this.balanceCurrentPage = 1;
        },

        // ── Pagination ────────────────────────────────────────────────
        prevJournalPage() { if (this.journalCurrentPage > 1) this.journalCurrentPage--; },
        nextJournalPage() { if (this.journalCurrentPage < this.totalJournalPages) this.journalCurrentPage++; },
        prevBalancePage() { if (this.balanceCurrentPage > 1) this.balanceCurrentPage--; },
        nextBalancePage() { if (this.balanceCurrentPage < this.totalBalancePages) this.balanceCurrentPage++; },

        // ── Helpers ───────────────────────────────────────────────────
        formatAmount(val) {
            return parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        accountTypeBadgeClass(type) {
            const map = {
                'Asset':     'badge-asset',
                'Liability': 'badge-liability',
                'Equity':    'badge-equity',
                'Revenue':   'badge-revenue',
                'Expense':   'badge-expense',
            };
            return map[type] || 'badge-secondary';
        },

        statusBadgeClass(status) {
            return status === 'Posted' ? 'badge-posted' : 'badge-unposted';
        },

        sortIcon(key, currentKey, order) {
            if (currentKey !== key) return '⇅';
            return order === 'asc' ? '↑' : '↓';
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 5000,
            };
            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error':   toastr.error('', message); break;
                default:        toastr.success('', message); break;
            }
        },
    },

    created() {
        // In production, replace with:
        // axios.get('/Dashboard/GetGlDashboardData').then(response => { ... })
    },
});
