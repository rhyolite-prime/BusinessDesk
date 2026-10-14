const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            invoiceList: [],
            invoiceId: '',
            customerList: [],
            customerId: '',
            customerName: '',
            accountNo: '',
            invoiceNo: '',
            currencyList: [],
            currencyId: '',
            currencyName: '',
            buyRate: '',
            sellRate: '',
            invoiceCurrencyId: '',
            invoiceCurrencyName: '',
            invoiceBuyRate: '',
            invoiceAmount: '',
            invoiceBalance: '',
            balance: '',
            description: '',
            liabilityGlId: this.emptyGuid,
            bankList: [],
            bankBranchList: [],
            bankId: '',
            bankName: '',
            bankBranchId: '',
            amount: '0.00',
            transactionDate: moment().format("YYYY-MM-DD"),
            modeOfPayment: 'Cash',
            chequeNumber: '00000000',
            cash: true,
            cheque: false,
            invoiceDate: moment().format("YYYY-MM-DD"),
            creditMemoList: [],
            creditMemoId: '',
            chequeDate: moment().format("YYYY-MM-DD"),
            ouList: [],
            ouNameList: [],
            departmentHierachyList: [],
            ouName: '',
            ouId: '',
            isInvoiceDebit: true,
            updating: false,
            accountsList: [],
            accountId: this.emptyGuid,
            accountName: '',
            liabilityAccountId: this.emptyGuid,
            liabilityAccountName: '',
            batchNumber: "0",
            isOu: false,
            memoId: window.memoId
        }
    },
    methods: {
        getBusinessProfile() {
            axios.get('/SharedResource/GetBusinessProfile').then(response => {
                if (response.data) {
                    this.isOu = response.data.enforceOu;
                    console.log(this.isVatInclusive);
                }
            }).catch(err => {
                console.log(err);
            });
        },
        initMemo() {

            axios.get('/LedgerDataEntry/InitJournalEntry').then(response => {

                let accounts = response.data.accounts;

                if (!accounts || accounts.length === 0) {
                    accounts = [{
                        id: this.emptyGuid,
                        accountIdentifier: 'No Ledger Available'
                    }];
                } else {
                    accounts.forEach(v => {
                        v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;
                    });
                    accounts.sort((a, b) => {
                        return Number(a.accountNo) - Number(b.accountNo);
                    });
                }
                this.accountsList = accounts;



                $( '#liabilityAccountId' ).ejDropDownList({
                    dataSource: this.accountsList,
                    width: "100%",
                    watermarkText: "Select Account",
                    fields: { id: "id", text: "accountIdentifier", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.liabilityAccountId = args.value;
                    }
                });

            }).catch(err => {

                this.toastHandler('error', 'Voucher initialization failed.');

            });
        },
        getDefaultGlSetup() {

            axios.get('/LedgerSetups/GetDefaultGlSetup').then(response => {

                let responseData = response.data;

                if (responseData) {

                    this.id = responseData.id;

                    $("#liabilityAccountId").ejDropDownList({

                        value: responseData.accountsReceivableAccountId,

                    });

                }
                $("#transactionDate").ejDatePicker({
                    width: "100%",
                    dateFormat: "yyyy-MM-dd",
                    value: moment().add(1, 'months').format("YYYY-MM-DD"),
                    change: (args) => {
                        this.transactionDate = args.value;
                    }
                });

            }).catch(err => {
                this.toastHandler('error', 'Unable to get default GL setup.');
            });
        },
        toggleIsInvoiceDebit() {
            this.isInvoiceDebit = !this.isInvoiceDebit;
            if (this.isInvoiceDebit) {
                this.getInvoices();
            }
            else{
                this.getCustomers();
            }
        },
        getCurrency() {
            axios.get('/SharedResource/GetCurrencys').then(response => {
                this.currencyList = response.data;

                this.defaultCurrency = this.currencyList.find(currency => {
                    const name = currency.currencyName.trim().toLowerCase();
                    return name === 'ghana cedis' || name === 'ghana cedi';
                });

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
                    value: this.currencyId,
                    change: (args) => {
                        this.currencyId = args.value;
                    }
                });
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
                let initOuId = this.ouId && this.ouId !== this.emptyGuid ? this.ouId : (this.costCenterHierachyList.length > 0 ? this.costCenterHierachyList[0].id : this.emptyGuid);


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
                this.setOu(initOuId);

            }).catch(err => {
                console.log(err);
                this.toastHandler('error', 'Unable to get cost centers.');
            });
        },
        setOu(id) {
            this.ouId = id;
            let ouInfo = this.getOuDetails(id);
            if (ouInfo) {
                this.ouId = ouInfo.id;
                this.ouName = ouInfo.name;
                $("#ouId").ejDropDownList({ value: ouInfo.id });
            } else {
                this.ouId = this.emptyGuid;
                this.ouName = '';
                $("#ouId").ejDropDownList({ value: this.emptyGuid });
            }
        },

        getOuDetails(id) {

            return this.costCenterHierachyList.find(a => a.id === id);
        },
        toggleCash() {
            this.cash = true;
            this.cheque = false;
            this.InitModeOfPayment();
        },
        toggleCheque() {
            this.cash = false;
            this.cheque = true;
            this.InitModeOfPayment();
            $("#chequeDate").ejDatePicker({
                width: "100%",
                dateFormat: "yyyy-MM-dd",
                value: moment().add(1, 'months').format("YYYY-MM-DD"),
                change: (args) => {
                    this.chequeDate = args.value;
                }
            });
        },
        InitModeOfPayment() {
            this.modeOfPayment = this.cash ? 'Cash' : 'Cheque';
           
        },
        getMemo() {
            axios.get('/ArDataEntry/GetCreditMemo')
                .then(response => {
                    this.creditMemoList = response.data.filter(a => a.isInvoiceDebit === false && a.id === this.memoId);

                    //format date
                    this.creditMemoList.forEach((item) => {
                        item.transactionDate = this.formatDate(item.transactionDate);
                        item.displayText = `${item.customerName} - ${item.invoiceNo} - ${item.amount}`;
                    });
                    this.setCurrentMemo(this.memoId);

                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get Credit Memos.');
                });
        },

        setCurrentMemo(id) {
                const memo = this.creditMemoList.find(a => a.id === id);
                this.updating = true;
                this.customerName = memo.customerName;
                this.accountNo = memo.accountNo;
                this.invoiceNo = memo.invoiceNo;
                this.currencyName = memo.currencyName;
                this.buyRate = parseFloat(memo.buyRate).toFixed(4);
                this.sellRate = memo.sellRate;
                this.invoiceCurrencyId = memo.invoiceCurrencyId;
                this.invoiceCurrencyName = memo.invoiceCurrencyName;
                this.invoiceAmount = parseFloat(memo.invoiceAmount).toFixed(2);
                this.invoiceBalance = parseFloat(memo.invoiceBalance).toFixed(2);
                this.balance = parseFloat(this.balance).toFixed(2);
                this.description = memo.description;
                this.liabilityGlId = memo.liabilityGlId;
                this.modeOfPayment = memo.modeOfPayment;
                this.isInvoiceDebit = memo.isInvoiceDebit;
                this.amount = parseFloat(memo.amount).toFixed(2);
                this.currencyId = memo.currencyId;
                this.transactionDate = this.formatDate(memo.transactionDate);
                this.bankId = memo.bankId;
                this.bankBranchId = memo.bankBranchId;
                this.bankName = memo.bankName;
                this.bankBranchName = memo.bankBranchName;
                this.invoiceBuyRate = parseFloat(memo.invoiceBuyRate).toFixed(4);
                this.ouId = memo.ouId;
                this.ouName = memo.ouName;
                this.chequeDate = this.formatDate(memo.chequeDate);
                this.chequeNumber = memo.chequeNo;
                this.customerId = memo.customerId;
                this.invoiceId = memo.invoiceId;
                this.tenantId = memo.tenantId;
                this.batchNumber = memo.batchNumber;
                //liabilityAccountId dropdown
                let dropdown = $("#liabilityAccountId").data("ejDropDownList");
                if (dropdown) {
                    dropdown.option("value", memo.liabilityGlId);
                }
        },
        
        getInvoices() {
            axios.get('/ArDataEntry/GetInvoices').then(response => {
                 //get invoices with this.customerId
                this.invoiceList = response.data.filter(a => a.isPosted === true && a.balance > 0 && a.customerId === this.customerId);
                    this.invoiceEdithList = this.invoiceList.filter(a => a.isPosted === true && a.balance > 0);
                    this.invoiceList.forEach((invoice) => {
                        invoice.invoiceId = invoice.id;
                        invoice.displayText = `${invoice.invoiceNumber} - ${invoice.currencyCode} ${invoice.balance}`;

                    });
                    $("#invoiceId").ejDropDownList({
                        dataSource: this.invoiceEdithList,
                        watermarkText: "Select Invoice",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.invoiceId = args.value;
                        }
                    });
                }
            ).catch(err => {
                this.toastHandler('error', 'Unable to get invoices.');
            });
        },
        getCustomers() {
            axios.get('/SharedResource/GetCustomers')
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
        setCustomer() {
            if (this.customerId) {
                const customer = this.customerList.find(a => a.id === this.customerId);
                this.customerName =customer.name;
                this.accountNo = customer.accountNumber;
                this.balance = parseFloat(customer.balance).toFixed(2);
            }
        },
    
        getCurrencyDetails(id) {
            return this.currencyList.find(a => a.id === id);
        },
        getBanks() {

            axios.get('/SharedResource/GetBanks').then(response => {

                this.bankList = response.data;

                $("#bankId" ).ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Bank",
                    width: "100%",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.bankId = args.value;
                    }
                });

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve banks.');

            });
        },
        getBankDetails(id) {

            return this.bankList.find(a => a.id === id);
        },
        getBankBranchDetails(id) {

            return this.bankBranchList.find(a => a.id === id);
        },
        getInvoiceDetails(id) {
            return this.invoiceList.find(a => a.id === id);
        },
        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");
        },

        setCurrentInvoice() {
            if (this.invoiceId) {
                const invoice = this.invoiceList.find(a => a.id === this.invoiceId);
                this.invoiceNo = invoice.invoiceNumber;
                this.invoiceCurrencyName =  invoice.currencyName;
                this.invoiceBuyRate = parseFloat(invoice.buyRate).toFixed(4);
                this.invoiceBalance = parseFloat(invoice.balance).toFixed(2);
            }
        },
        setBuyRate() {
            if (this.currencyId) {
                const currency = this.currencyList.find(a => a.id === this.currencyId);
                this.buyRate = parseFloat(currency.buyRate).toFixed(4);
            }
        },
        async applyMemo() {
            this.isLoading = true;
            this.InitModeOfPayment();
            let payload = {};
            payload.chequeDate = this.chequeDate;
            payload.chequeNo = this.chequeNumber;
            if (this.invoiceId) {
                let invoiceInfo = this.getInvoiceDetails(this.invoiceId);
                if (invoiceInfo) {
                    payload.invoiceId = invoiceInfo.id;
                    payload.invoiceNo = invoiceInfo.invoiceNumber;
                    payload.invoiceCurrencyId = invoiceInfo.currencyId;
                    payload.invoiceCurrencyName = invoiceInfo.currencyName;
                    payload.invoiceBuyRate = invoiceInfo.buyRate;
                    payload.invoiceBalance = invoiceInfo.balance;
                    payload.customerId = invoiceInfo.customerId;
                    payload.customerName = invoiceInfo.customerName;
                    payload.accountNo = invoiceInfo.accountNumber;
                }
            }
            if (this.currencyId) {
                let currencyInfo = this.getCurrencyDetails(this.currencyId);
                if (currencyInfo) {
                    payload.currencyId = this.currencyId;
                    payload.currencyName = currencyInfo.currencyName;
                    payload.currencyCode = currencyInfo.currencyCode;
                    payload.accountNo = currencyInfo.accountNumber;
                    payload.buyRate = currencyInfo.buyRate;
                    payload.sellRate = currencyInfo.sellRate;
                }
            }

            if (this.ouId) {
                let ouInfo = this.getOuDetails(this.ouId);
                if (ouInfo) {
                    payload.ouName = ouInfo.name;
                }

            }
            else
            {
                this.ouId = this.emptyGuid;
                payload.ouName = 'No OU';
            }
            if (this.bankId) {

                let bankInfo = this.getBankDetails(this.bankId);
                if (bankInfo) {

                    payload.bankId = this.bankId;
                    payload.bankName = bankInfo.name;
                }

            } else {

                payload.bankId = this.emptyGuid;
            }
            if (this.bankBranchId) {

                let bankBranchInfo = this.getBankBranchDetails(this.bankBranchId);
                if (bankBranchInfo) {
                    payload.bankBranchId = this.bankBranchId;
                    payload.departmentName = bankBranchInfo.name;
                }


            } else {
                payload.bankBranchId = this.emptyGuid;
            }
            payload.transactionDate = this.transactionDate;
            payload.amount = this.amount;
            payload.modeOfPayment = this.modeOfPayment;
            payload.description = this.description;
            payload.batchNumber = this.batchNumber;
            if( this.liabilityAccountId) {
                let liabilityAccountInfo = this.accountsList.find(a => a.id === this.liabilityAccountId);
                if (liabilityAccountInfo) {
                    payload.liabilityGlId = liabilityAccountInfo.id
                    payload.liabilityName = liabilityAccountInfo.accountName;
                }
            } else {
                payload.liabilityGlId = this.emptyGuid;
                payload.liabilityName = 'No Liability Account';
            }
            payload.ouId = this.ouId;
            payload.isInvoiceDebit = true;
            payload.id = this.memoId;
            payload.tenantId = this.tenantId;
            axios.post('/ArDataEntry/ApplyArCreditMemo', payload)
                .then(async response => {
                    this.invoiceId = payload.id;
                    this.toastHandler('', 'Credit Memo updated.');
                    $('#addEdit').modal('hide');
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to Apply Credit Memo.');
                    $('#addEdit').modal('hide');
                    this.isLoading = false;
                });

        },
 
        validateForm() {
            if (this.$refs.creditMemo.checkValidity()) {
                // if form is valid display modal #addEdit
                $('#addEdit').modal('show');
            } else {
                // If form is invalid, show validation error messages
                this.$refs.voucherForm.reportValidity();
                $('#addEdit').modal('hide');

            }
        },
        clearForm() {
            window.location.reload();
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
        creditMemoId(val){
            if(val){
                this.setCurrentMemo();
            }
        },
        invoiceId(val) {

            if (val) {

                this.setCurrentInvoice();

            }
        },
        customerId(val) {

            if (val) {

                let customerInfo = this.getCustomerDetails(val);
                if (customerInfo) {
                    this.customerName = customerInfo.name;
                    this.accountNo = customerInfo.accountNumber;
                }
                this.setCustomer();
                this.getInvoices();

            }

        },
        currencyId(val) {
            if (val) {

                this.setBuyRate();

            }
        },
        bankId(val) {

            if (val) {

                let bankInfo = this.getBankDetails(val);
                if (bankInfo) {
                    this.bankBranchList = [...bankInfo.bankBranches].sort((a, b) => {
                        const nameA = a?.name || "";
                        const nameB = b?.name || "";
                        return nameA.localeCompare(nameB);
                    });
                }
                $("#branchId").ejDropDownList({
                    dataSource: this.bankBranchList,
                    watermarkText: "Select Branch",
                    width: "100%",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.bankBranchId = args.value;
                    }
                });

            }

        },
    },
    mounted() {
        this.memoId = window.memoId;
        this.getCustomers();
        this.getBusinessProfile();
        this.getCurrency();
        this.getBanks();
        this.initMemo();
        this.getDefaultGlSetup();
        this.getCostCenters();
        this.getMemo();
    }

});
app.mount('#app');

    