var vue = new Vue({
    el: '#app',
    data: {

        emptyGuid: '00000000-0000-0000-0000-000000000000',
        isLoading: false,
        payload: {},
        reportType: 'account',
        journalEntryType: 'local',
        batchNo: '',
        reportApiBaseUrl: '',
        costCenterList: [],
        costCenterNameList: [],
        costCenterHierachyList: [],
        accountList: [],
        accountId: '',
        startDate: moment().format("YYYY-MM-DD"),
        endDate: moment().format("YYYY-MM-DD"),
        ouId: '',
        reportPath: '',
        reportPathConfig: {
            accountReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1776921896/erp-reports/gl/gl-transactions-by-account_az3on3.rdl',
            priorAccountReportPath: '',
            allAccountsReportPath: '',
            noBalanceAccountsReportPath: '',
            batchNumbersReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1776911272/erp-reports/gl/daily-transactions_wkzpvu.rdl',
            dailyTransactionsReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1776911272/erp-reports/gl/daily-transactions_wkzpvu.rdl',
            accountDetailsReportPath: '',
            noBatchNumbersReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1777997680/erp-reports/gl/no-batch-numbers_ikkm14.rdl',
            unMatchedOusReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1777914253/erp-reports/gl/un-matched-ous_lxwgum.rdl',
            unBalancedTransactionsReportPath: '',
            unBalancedReportPath: '',
            bankReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1777907114/erp-reports/gl/bank-report_ra6tzk.rdl',
            fxRevaluationReportPath: '',
        },
        
    },

    methods: {
        
        getReportData() {
            
            this.isLoading = true;

            if (!this.ouId) {
                this.ouId = this.emptyGuid;
            }

            if (!this.accountId) {
                this.accountId = this.emptyGuid;
            }

            // Report path mapping
            const reportPathMap = {
                'account': this.reportPathConfig.accountReportPath,
                'prior-account': this.reportPathConfig.priorAccountReportPath,
                'all-accounts': this.reportPathConfig.allAccountsReportPath,
                'no-balance-accounts': this.reportPathConfig.noBalanceAccountsReportPath,
                'batch-numbers': this.reportPathConfig.batchNumbersReportPath,
                'daily-transactions': this.reportPathConfig.dailyTransactionsReportPath,
                'account-details': this.reportPathConfig.accountDetailsReportPath,
                'no-batch-numbers': this.reportPathConfig.noBatchNumbersReportPath,
                'unmatched-ous': this.reportPathConfig.unMatchedOusReportPath,
                'unbalanced-transactions': this.reportPathConfig.unBalancedTransactionsReportPath,
                'bank-report': this.reportPathConfig.bankReportPath,
                'fx-revaluations': this.reportPathConfig.fxRevaluationReportPath,
            };

            this.reportPath = reportPathMap[this.reportType];

            let accountInfo = this.accountList.find(a => a.id === this.accountId);

            let payload = {
                reportType: this.reportType,
                startDate: this.startDate,
                endDate: this.endDate,
                ouId: this.ouId,
                batchNo: this.batchNo,
                journalEntryType: this.journalEntryType,
                accountId: this.accountId,
                accountName: accountInfo ? `${accountInfo.accountNo}-${accountInfo.accountName}` : '',
            };

            console.log('payload->', payload);

            axios.post('/LedgerReports/GetGlTransactionReports', payload).then(response => {

                if (response.data.reportDetails &&
                    response.data.reportDetails.hasOwnProperty('success') &&
                    response.data.reportDetails.success === false) {

                    const errorMessage = response.data.reportDetails.message || 'An error occurred while generating the report.';
                    this.toastHandler('error', errorMessage);
                    this.isLoading = false;
                    return;
                }


                // Report renderer mapping
                const reportRenderers = {
                    'account': this.renderAccountReport,
                    'prior-account': this.renderPriorAccountReport,
                    'all-accounts': this.renderAllAccountsReport,
                    'no-balance-accounts': this.renderNoBalanceAccountsReport,
                    'batch-numbers': this.renderBatchNumbersReport,
                    'daily-transactions': this.renderDailyTransactionsReport,
                    'account-details': this.renderAccountDetailsReport,
                    'no-batch-numbers': this.renderNoBatchNumbersReport,
                    'unmatched-ous': this.renderUnmatchedOusReport,
                    'unbalanced-transactions': this.renderUnbalancedTransactionsReport,
                    'bank-report': this.renderBankReport,
                    'fx-revaluations': this.renderFxRevaluationsReport,
                };

                const renderer = reportRenderers[this.reportType];
                renderer.call(this, response.data.reportHeader, response.data.reportDetails, this.reportPath);

                this.isLoading = false;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get report data');
                this.isLoading = false;
                 
            });
        },
        
        getOus() {

            axios.get('/SharedResource/GetCostCenters').then(response => {

                this.parseHierachy(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get cost centers.');

            });
        },

        parseHierachy(dataArr) {

            this.costCenterList = dataArr;

            let costCenterHierachyList = [];

            for (let i = 0; i < this.costCenterList.length; i++) {

                this.getHierachyName(this.costCenterList[i].id);

                let name = [...new Set(this.costCenterNameList)].join().replace(/,/g, '/');

                costCenterHierachyList.push({
                    name: name,
                    parentId: this.costCenterList[i].parentId,
                    id: this.costCenterList[i].id,
                    rawName: this.costCenterList[i].name,
                    tenantId: this.costCenterList[i].tenantId,
                });

                name = [];

                this.costCenterNameList = [];

            }

            this.costCenterHierachyList = costCenterHierachyList;

        },

        getHierachyName(id) {

            let parentId;
            let returnName;
            this.costCenterList.forEach(item => {

                if (item.id === id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }

                this.costCenterList.forEach(cc => {
                    if (cc.id === parentId) {
                        return (`${this.getHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.costCenterNameList.push(returnName);

        },

        getLedgerAccounts() {

            axios.get('/LedgerSetups/GetLedgerAccounts').then(response => {

                this.accountList = response.data;

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get cost centers.');

            });
        },

        renderAccountReport(header, details, reportPath) {
            let openingBalance = [details.openingBalance];

            let dataSources = [
                { value: header, name: "DataSet1" },
                { value: details.transactions, name: "DataSet2" },
                { value: openingBalance, name: "DataSet3" }
            ];

            this.renderReportBase(header, details, reportPath, dataSources);
        },

        renderBankReport(header, details, reportPath) {
            let openingBalance = [details.openingBalance];

            let dataSources = [
                { value: header, name: "DataSet1" },
                { value: details.transactions, name: "DataSet2" },
                { value: openingBalance, name: "DataSet3" }
            ];

            this.renderReportBase(header, details, reportPath, dataSources);
        },

        renderDailyTransactionsReport(header, details, reportPath) {
            this.renderReportBase(header, details, reportPath);
        },

        renderBatchNumbersReport(header, details, reportPath) {
            this.renderReportBase(header, details, reportPath);
        },

        renderUnmatchedOusReport(header, details, reportPath) {
            this.renderReportBase(header, details, reportPath);
        },

        renderNoBatchNumbersReport(header, details, reportPath) {
            this.renderReportBase(header, details, reportPath);
        },


        renderReportBase(header, details, reportPath, dataSourceConfig = null) {
           
            $("#reportView").empty();

            let defaultDataSources = [
                {
                    value: header,
                    name: "DataSet1"
                },
                {
                    value: details,
                    name: "DataSet2"
                }
            ];

            // Allow custom data source configuration
            let dataSources = dataSourceConfig || defaultDataSources;

            $("#reportView").boldReportViewer({
                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                reportPath: reportPath,
                dataSources: dataSources
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
    
   
    created() {

         this.getOus();
         this.getLedgerAccounts();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});