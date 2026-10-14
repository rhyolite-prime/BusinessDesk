const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            reportType: 'type1',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            reportApiBaseUrl: '',
            supplierList: [],
            ouId: '',
            ouList: [],
            ouName: '',
            costCenterHierachyList: [],
            costCenterList: [],
            ouNameList: [],
            supplierId: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755696840/erp-reports/ap/statementByOuType1Ap_eoy3ph.rdl',
                type1ReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755696840/erp-reports/ap/statementByOuType1Ap_eoy3ph.rdl',
                type2ReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755695539/erp-reports/ap/statementByOuType2Ap_k8qcsa.rdl',
            },
        }
    },

    methods: {
        getReportData() {
            this.isLoading = true;

            //if start date is greater than end date, show error
            if (moment(this.startDate).isAfter(this.endDate)) {
                this.toastHandler('warning', 'Start date cannot be greater than end date.');
                this.isLoading = false;
                return;
            }

            //if supplierId is not selected, show error
            if (!this.supplierId) {
                this.toastHandler('warning', 'Please select a supplier.');
                this.isLoading = false;
                return;
            }

            let url = `GetStatementByOu?supplierId=${this.supplierId}&ouId=${this.ouId}&startDate=${this.startDate}&endDate=${this.endDate}&ouName=${this.ouName}`;
            this.reportPath = this.reportPathConfig.type1ReportPath;

            switch (this.reportType) {
                case 'type1':
                    this.reportPath = this.reportPathConfig.type1ReportPath;
                    url = `GetStatementByOu?supplierId=${this.supplierId}&ouId=${this.ouId}&startDate=${this.startDate}&endDate=${this.endDate}&ouName=${this.ouName}`;
                    break;
                case 'type2':
                    this.reportPath = this.reportPathConfig.type2ReportPath;
                    url = `GetStatementByOuType2?supplierId=${this.supplierId}&ouId=${this.ouId}&startDate=${this.startDate}&endDate=${this.endDate}&ouName=${this.ouName}`;
                    break;
               
                default:
                    this.toastHandler('warning', 'Please select a valid report type.');
                    this.isLoading = false;
                    return;
            }

            axios.get(url)
                .then(response => {
                    this.renderReport(response.data.reportHeader, response.data.reportDetails.data, response.data.reportDetails.summary, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },



        renderReport(header, details, summary, reportPath) {

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
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                    {
                        value: details,
                        name: "DataSet2"
                    },
                {
                        value: summary,
                        name: "DataSet3"
                    }],


            });

        },

        getSuppliers() {
            axios.get('/SharedResource/GetSuppliers')
                .then(response => {
                    this.supplierList = response.data;
                    if (this.supplierList.length > 0) {
                        this.supplierId = this.supplierList[0].id;
                    } else {
                        this.supplierId = null;
                    }

                    $("#supplierId").ejDropDownList({
                        dataSource: this.supplierList,
                        watermarkText: "Select Supplier",
                        width: "100%",
                        fields: { id: "id", text: "name", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.supplierId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get suppliers.');
                });
        },

        parseCostCenterHierachy(dataArr) {

            this.ouList = dataArr;

            let costCenterHierachyList = [];

            for (let i = 0; i < this.costCenterList.length; i++) {

                this.getHierachyName(this.costCenterList[i].id);

                let name = [...new Set(this.ouNameList)].join().replace(/,/g, '/');

                costCenterHierachyList.push({
                    name: name,
                    parentId: this.costCenterList[i].parentId,
                    id: this.costCenterList[i].id,
                    rawName: this.costCenterList[i].name,
                    tenantId: this.costCenterList[i].tenantId,
                });

                name = [];

                this.ouNameList = [];

            }

            return costCenterHierachyList;

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

            this.ouNameList.push(returnName);

        },
        getCostCenters() {
            axios.get('/SharedResource/GetCostCenters/').then(response => {

                this.costCenterList = response.data;

                const parsed = this.parseCostCenterHierachy(response.data);
                this.costCenterHierachyList = parsed;

                $("#ouId").ejDropDownList({
                    dataSource: this.costCenterHierachyList,
                    width: "100%",
                    watermarkText: "Select OU/Cost Center",
                    fields: { id: "id", text: "name", value: "id" },
                    value: this.ouId,
                    enableFilterSearch: true,
                    change: (args) => {
                        this.ouId = args.value;
                    }
                });

            }).catch(err => {
                console.log(err);
                this.toastHandler('error', 'Unable to get cost centers.');
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

        ouId: function (val) {

            let ouInfo = this.costCenterHierachyList.find(x => x.id === val);

            if (ouInfo) {
                this.ouName = ouInfo.name; 
                console.log("Selected OU Name:", this.ouName);
            }
        }

    },
    mounted() {
        this.getSuppliers();
        this.getCostCenters();
        //  this.getReportData();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');