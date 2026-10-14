var vue = new Vue({
    el: '#app',
    data: {

        emptyGuid: '00000000-0000-0000-0000-000000000000',
        isLoading: false,
        payload: {},
        reportType: 'i',
        reportApiBaseUrl: '',
        costCenterList: [],
        costCenterNameList: [],
        costCenterHierachyList: [],
        includeUnpostedTransaction: false,
        includeAllAccounts: false,
        isDetailed: false,
        revalue: '',
        includeGlTransactions: false,
        includeArTransactions: false,
        includeApTransactions: false,
        lastClosedPeriod: '31-Dec-2024',
        endDate: '',
        ouId: '',
        reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1765277151/erp-reports/gl/daily-transactions_q0eiwr.rdl',
        reportPathConfig: { },
        
    },

    methods: {

        getReportData() {

            this.isLoading = true;

            if (!this.ouId) {

                this.ouId = this.emptyGuid;
            }

            let payload = {
                endDate: this.endDate,
                includeUnpostedTransaction: false,
                includeAllAccounts: false,
                isDetailed: false,
                ouId: this.ouId,
                revalue: false,
                includeGlTransactions: false,
                includeArTransactions: false,
                includeApTransactions: false,
            }
            
            
            axios.post('LedgerReports/GetBalanceSheetDetail', payload ).then(response => {

                this.renderReport(response.data.reportHeader, response.data.reportDetails, this.reportPath);

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

        renderReport(header, details, reportPath) {

            $("#reportView").empty();

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                reportPath: reportPath,
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                {
                    value: details,
                    name: "DataSet2"
                }]
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
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});