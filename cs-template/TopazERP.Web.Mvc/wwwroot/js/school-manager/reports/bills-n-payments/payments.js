const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            reportType: '2',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            reportApiBaseUrl: '',
            bankId:'',
            banks:[],
            bankGlId:'',
            accounts:[],
            payments:[],
            allPayments:[],
            url:'',
            header: [],
            isInitialLoad:true,
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784213156/erp-reports/school-manager/payment-summary_hswrdk.rdl',
                detailsReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784213156/erp-reports/school-manager/payment-details_ola2ri.rdl',
                bankPaymentReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784213156/erp-reports/school-manager/payments-banks_neodxf.rdl',
                glAccountReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784213156/erp-reports/school-manager/payments-bankGl_xdpnri.rdl',
            },
        }
    },
    computed: {
        selectedBankName() {
            if (!this.bankId) return "No Bank Selected";

            const bank = this.banks.find(x => x.id === this.bankId);
            return bank ? bank.name : "";
        },

        selectedGlAccountName() {
            if (!this.bankGlId) return "No GL Account Selected";

            const account = this.accounts.find(x => x.id === this.bankGlId);
            return account ? account.accountIdentifier : "";
        },

        reportTitle() {
            const dateRange = `${moment(this.startDate).format("DD/MM/YYYY")} To ${moment(this.endDate).format("DD/MM/YYYY")}`;

            switch (this.reportType) {
                case "1":
                    return `Payment Summary From ${dateRange}`;

                case "2":
                    return `Payment Details From ${dateRange}`;

                case "3":
                    return `Payments By Bank (${this.selectedBankName}) From ${dateRange}`;

                case "4":
                    return `Payments By GL Account (${this.selectedGlAccountName}) From ${dateRange}`;

                default:
                    return `Payments From ${dateRange}`;
            }
        }
    },
    methods: {
        getBanks() {
            return axios.get('/SharedResource/GetBanks').then(res => {
                this.banks = res.data;
            });
        },
        getAccounts() {
            return axios.get('/LedgerSetups/GetChartOfAccountDetails').then(res => {
                this.accounts = res.data.accountDetails;
                this.processAccountsList();
            });
        },
        processAccountsList() {
            if (!this.accounts || this.accounts.length === 0) {
                this.accounts = [{
                    id: this.emptyGuid,
                    accountIdentifier: 'No Ledger Available'
                }];
            } else {
                this.accounts.forEach(v => {
                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;
                });
                this.accounts.sort((a, b) => Number(a.accountNo) - Number(b.accountNo));
            }
        },
        getReportData() {
            this.isLoading = true;
            if (moment(this.startDate).isAfter(this.endDate)) {
                this.toastHandler('warning', 'Start date cannot be greater than end date.');
                this.isLoading = false;
                return;
            }
            this.reportPath = this.reportPathConfig.detailsReportPath;
            if (this.reportType === '1') {
                this.reportPath = this.reportPathConfig.summaryReportPath;
            }
            else if (this.reportType === '2') {
                this.reportPath = this.reportPathConfig.detailsReportPath;
            }
            else if (this.reportType === '3') {
                this.reportPath = this.reportPathConfig.bankPaymentReportPath;
            }
            else if (this.reportType === '4') {
                this.reportPath = this.reportPathConfig.glAccountReportPath;
            }
            this.url = `/SmReports/GetPayments?startDate=${this.startDate}&endDate=${this.endDate}&title=${encodeURIComponent(this.reportTitle)}`;
            axios.get(this.url)
                .then(response => {
                    this.header = response.data.reportHeader;
                    const details = response.data.reportDetails;
                    this.allPayments = details;
                    this.payments = [...details];

                    if (this.reportType === "3") {

                        this.filterPaymentsByBank(this.bankId);

                    }
                    else if (this.reportType === "4") {

                        this.filterPaymentsByGlAccount(this.bankGlId);

                    }
                    else {

                        this.$nextTick(() => {
                            this.searchReport();
                        });

                    }

                    if (response.data.message) {
                        this.toastHandler('warning', response.data.message);
                    }

                    this.isLoading = false;
                    this.searchReport();
                })
                .catch(err => {
                    this.toastHandler('warning', 'Data not found');
                    this.isLoading = false;
                });
            },
        searchReport() {
            
            this.renderReport(this.header, this.payments, this.reportPath);
        },
        filterPaymentsByBank(bankId) 
        { 
            if (!bankId) 
            { 
                this.payments = [...this.allPayments]; 
            } else 
            { 
                this.payments = this.allPayments.filter(payment => payment.bankId === bankId); 
            } 
            this.searchReport(); 
            }, 
        filterPaymentsByGlAccount(glAccountId) 
        { 
            if (!glAccountId) 
            { 
                this.payments = [...this.allPayments]; 
            } else 
            { 
                this.payments = this.allPayments.filter(payment => payment.bankGlId === glAccountId); 
            } 
            this.searchReport(); 
            },

        renderReport(header, details, reportPath) {
            $("#reportView").empty();

            $("#reportView").boldReportViewer({
                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                toolbarSettings: {
                    showToolbar: true,
                    items: ej.ReportViewer.ToolbarItems.All &
                        ~ej.ReportViewer.ToolbarItems.Print
                },
                reportPath: reportPath,
                dataSources: [
                    {
                        value: header,
                        name: "DataSet1"
                    },
                    {
                        value: details,
                        name: "DataSet2"
                    }
                ],
                reportError: (args) => {
                    console.error('Bold Report error:', args);
                    this.toastHandler('warning', 'No data available for the selected criteria.');
                }
            });
        },


        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");
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
        watch: {
            reportType() {

                if(this.isInitialLoad)
                    return;

                this.bankId = '';
                this.bankGlId = '';
                this.getReportData();

            },
        },
    async mounted() {

        this.reportApiBaseUrl = reportApiBaseUrl;

        await this.getBanks();
        await this.getAccounts();
        await this.getReportData();

        this.isInitialLoad = false;

    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');