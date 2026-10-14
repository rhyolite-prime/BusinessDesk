const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            customerList: [],
            customerId: '',
            openingBalanceList: [],
            amount: '0.00',
            paidAmount: '0',
            balance: '0',
            isPosted: false,
            openingBalanceId: null,
            currencyList: [],
            currencyId: '',
            ouList: [],
            ouId: '',
            costCenterHierachyList: [],
            costCenterList: [],
            ouNameList: [],
            paymentAmount: '0',
            paymentDate: moment().format("YYYY-MM-DD"),
            postedopeningBalanceId: '',
            postedOpeningBalanceList: [],
            tenantId: '',
            departmentId: '',
            departmentList: [],
            selectedBalanceList: [],
            buyRate: '',
            defaultCurrency: '',
            transactionDate: moment().format("YYYY-MM-DD"),
            accountNumber: '',
            isOu: true,
            balanceId: window.balanceId,
        }
    },
    methods: {
        getBusinessProfile() {
            axios.get('/SharedResource/GetBusinessProfile').then(response => {
                if (response.data) {
                    //  this.isOu = response.data.enforceOu;
                    console.log(this.isVatInclusive);
                }
            }).catch(err => {
                console.log(err);
            });
        },
        getOpeningBalances() {
            axios.get('/ArDataEntry/GetOpeningBalances/')
                .then(response => {
                    this.openingBalanceList = response.data.filter(a => a.isPosted === false && a.id === this.balanceId);
                    this.openingBalanceList.forEach(item => {
                        item.transactionDate = this.formatDate(item.transactionDate);
                    });
                    this.setCurrentOpeningBalance(this.balanceId);
                })
                .catch(error => {
                    console.log(error);
                    this.isLoading = false;
                });
        },
        //get opening balance details
        getOpeningBalanceDetails(id) {
            return this.openingBalanceList.find(a => a.id === id);
        },
        getCustomers() {
            axios.get('/SharedResource/GetCustomers/')
                .then(response => {
                    this.customerList = response.data.sort((a, b) => a.name.localeCompare(b.name)).filter(a => a.status.trim().toLowerCase() === 'active');

                    $("#customerId").ejDropDownList({
                        dataSource: response.data,
                        watermarkText: "Select Customer",
                        width: "100%",
                        fields: { id: "id", text: "name", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.customerId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get customers.');
                });
        },

        getCustomerDetails(id) {
            return this.customerList.find(a => a.id === id);
        },


        //get currency
        getCurrency() {
            axios.get('/SharedResource/GetCurrencys').then(response => {
                this.currencyList = response.data;

                this.defaultCurrency = this.currencyList.find(c =>
                    c.currencyName.trim().toLowerCase() === 'ghana cedis' ||
                    c.currencyName.trim().toLowerCase() === 'ghana cedi'
                );

                if (this.defaultCurrency) {
                    this.currencyId = this.defaultCurrency.id;
                    this.buyRate = parseFloat(this.defaultCurrency.buyRate).toFixed(4);
                }

                $('#currencyId').ejDropDownList({
                    dataSource: this.currencyList,
                    width: "100%",
                    watermarkText: "Select Currency",
                    fields: { id: "id", text: "currencyName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => { this.currencyId = args.value; }
                });

                if (this.currencyId) {
                    $('#currencyId').ejDropDownList("option", "value", this.currencyId);
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to get currency.');
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

                console.log("📦 Final Dropdown Data:", this.costCenterHierachyList);

                $("#ouId").ejDropDownList({
                    dataSource: this.costCenterHierachyList,
                    width: "100%",
                    watermarkText: "Select OU/Cost Center",
                    fields: { id: "id", text: "name", value: "id" },
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


        getOuDetails(id) {

            return this.costCenterHierachyList.find(a => a.id === id);
        },
        getCurrencyDetails(id) {
            return this.currencyList.find(a => a.id === id);
        },

        getHeriechy(){
            axios.get('/ApDataEntry/GetOuHierarchy/').then(response => {
                this.ouList = response.data;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get OU Heriechy.');
            });
        },
        updateOpeningBalance() {
            this.isLoading = true;
            let payload = {};
            payload.amount = this.amount;
            payload.transactionDate = this.transactionDate;
            payload.isPosted = this.isPosted;
            if (this.currencyId) {
                let currencyInfo = this.getCurrencyDetails(this.currencyId);
                if (currencyInfo) {
                    payload.currencyId = currencyInfo.id;
                    payload.currencyName = currencyInfo.currencyName;
                    payload.currencyCode = currencyInfo.currencyCode;
                    payload.buyRate = this.buyRate;
                    payload.sellRate = currencyInfo.sellRate;
                }
            }
            if (this.customerId) {
                let customerInfo = this.getCustomerDetails(this.customerId);
                if ( customerInfo) {
                    payload.customerId =  customerInfo.id;
                    payload.customerName =  customerInfo.name;
                    payload.accountNumber =  customerInfo.accountNumber;
                }
            }
            if (this.ouId) {
                let ouInfo = this.getOuDetails(this.ouId);
                if (ouInfo) {
                    payload.ouId = ouInfo.id;
                    payload.ouName = ouInfo.name;
                }
            }
            else{
                payload.ouId = this.emptyGuid;
                payload.ouName = 'N/A';
            }

            payload.id = this.balanceId;
            payload.tenantId = this.tenantId;
            axios.post('/ArDataEntry/UpdateOpeningBalances', payload).then(response => {
                this.toastHandler('', 'Opening Balance info updated.');
                this.isLoading = false;
                this.getOpeningBalances();
                window.location.href = `/ArDataEntry/ArOpeningBalances/`;
            }).catch(err => {
                this.toastHandler('error', 'Unable to update Opening Balance info.');
                this.isLoading = false;
            });
        },
        setCurrentOpeningBalance(id) {
            let openingBalanceInfo = this.getOpeningBalanceDetails(this.balanceId);

            this.amount = parseFloat(openingBalanceInfo.amount).toFixed(2);
            this.transactionDate = moment(openingBalanceInfo.transactionDate).format("YYYY-MM-DD");
            this.isPosted = openingBalanceInfo.isPosted;
            this.currencyId = openingBalanceInfo.currencyId;
            this.buyRate = parseFloat(openingBalanceInfo.buyRate).toFixed(4);
            this.ouId = openingBalanceInfo.ouId;

            this.customerId = openingBalanceInfo.customerId;
            this.tenantId = openingBalanceInfo.tenantId;

            this.$nextTick(() => {
                $("#customerId").ejDropDownList("option", "value", this.customerId);
                $("#currencyId").ejDropDownList("option", "value", this.currencyId);
                $("#ouId").ejDropDownList("option", "value", this.ouId);
            });
        },

        printReport() {
            let customerId = this.customerId || '';
            let status =  'all';
            let reportUrl = `/ArReports/PrintOpeningBalance?customerId=${customerId}&status=${status}`;
            window.open(reportUrl, '_blank');
        },
        
        //formatdate
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
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
        clearForm() {
            window.location.reload();
        },

    },
    watch: {
        openingBalanceId(val) {

            if (val) {

                this.setCurrentOpeningBalance();

            }

        },
    },
    mounted(){
        this.balanceId = window.balanceId;
        this.getCustomers();
        this.getCurrency();
        this.getCostCenters();
        this.getBusinessProfile();
        this.getHeriechy();
        this.getOpeningBalances();
    },
});
app.mount('#app');
    