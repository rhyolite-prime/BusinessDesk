const app = Vue.createApp({
    data() {
        return{
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            supplierList: [],
            supplierGroupList: [],
            accountNumber: '',
            supplierGroupId: '',
            currencyList: [],
            statusId: '',
            address: '',
            balance: 0.00,
            vatNumber: '',
            vatAccountId: '',
            name: '',
            tinNumber: '',
            phoneNo: '',
            email: '',
            currencyId: '',
            creditLimit: 0.00,
            irsAccountId: '',
            selectedSupplierId: '',
            supplierId: null,
            selectedSupplierGroupId: '',
            isResident: false,
            taxOffice: '',
            currencyCode: '',
            contactPerson: '',
            contactPersonPhone: '',
            contactPersonEmail: '',
            defaultCurrency: '',
            defaultStatus: '',
            statusList:[
                { id: 1, name: 'Active' },
                { id: 2, name: 'Inactive' },
                { id: 3, name: 'Dormant' },
            ],
            debitAccountId: '',
            creditAccountId: '',
            vatAccountName: '',
            irsAccountName: '',
            debitAccountName: '',
            creditAccountName: '',
            accountsList: [],
            tenantId: '',
        }
        
    },
    methods: {
         initSupplier () {
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
                 }
                 
                 //sort accounts by accountNo
                    accounts.sort((a, b) => {
                        if (a.accountNo < b.accountNo) return -1;
                        if (a.accountNo > b.accountNo) return 1;
                        return 0;
                    });

                 this.accountsList = accounts;
                 


                 $( '#debitAccountId' ).ejDropDownList({
                     dataSource: response.data.accounts,
                     width: "100%",
                     watermarkText: "Select Account",
                     fields: { id: "id", text: "accountIdentifier", value: "id" },
                     enableFilterSearch: true,
                     change: (args) => {
                         this.debitAccountId = args.value;
                     }
                 });

                 $( '#creditAccountId' ).ejDropDownList({
                     dataSource: response.data.accounts,
                     width: "100%",
                     watermarkText: "Select Account",
                     fields: { id: "id", text: "accountIdentifier", value: "id" },
                     enableFilterSearch: true,
                     change: (args) => {
                         this.creditAccountId = args.value;
                     }
                 });

                 $( '#vatAccountId' ).ejDropDownList({
                     dataSource: response.data.accounts,
                     width: "100%",
                     watermarkText: "Select Account",
                     fields: { id: "id", text: "accountIdentifier", value: "id" },
                     enableFilterSearch: true,
                     change: (args) => {
                         this.vatAccountId = args.value;
                     }
                 });
                 
                    $( '#irsAccountId' ).ejDropDownList({
                        dataSource: response.data.accounts,
                        width: "100%",
                        watermarkText: "Select Account",
                        fields: { id: "id", text: "accountIdentifier", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.irsAccountId = args.value;
                        }
                    });
                    

             }).catch(err => {

                 this.toastHandler('error', 'payment initialization failed.');

             });
         },
        getDefaultGlSetup() {

            axios.get('/LedgerSetups/GetDefaultGlSetup').then(response => {

                let responseData = response.data;
                
                if (responseData) {

                    this.id = responseData.id;

                    $("#creditAccountId").ejDropDownList({

                        value: responseData.accountsPayableAccountId,

                    });
                    $("#debitAccountId").ejDropDownList({

                        value: responseData.accountsPayableAccountId,

                    });
                    $("#vatAccountId").ejDropDownList({
                        value: responseData.vatPaidAccountId,
                    });
                    $("#irsAccountId").ejDropDownList({
                        value: responseData.accountsPayableAccountId,
                    });


                }


            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get default GL numbers.');

            });
        },
        formatNumber(number) {
            if (number < 0) {
                return `(${Math.abs(number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            }
            return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        //get suppliers
        getSuppliers() {
            axios.get('/SharedResource/GetSuppliers')
                .then(response => {
                    this.supplierList = response.data.sort((a, b) => a.name.localeCompare(b.name));
                    this.renderTable(this.supplierList);
                    this.supplierList.forEach(supplier => {
                        supplier.displayName = supplier.name + ' - ' + supplier.accountNumber;
                        
                    });
                    

                    $("#supplierId").ejDropDownList({
                        dataSource: response.data,
                        watermarkText: "Select Supplier",
                        width: "100%",
                        fields: { id: "id", text: "displayName" , value: "id" },
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
        
        //get supplier details
        getSupplierDetails(id) {
            return this.supplierList.find(a => a.id === id);
        },
        

        //get supplier groups
        getSupplierGroups() {
            axios.get('/SharedResource/GetSupplierGroups').then(response => {
                this.supplierGroupList = response.data;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get supplier groups.');
            });
        },
        //get currency
        getCurrency() {
            axios.get('/SharedResource/GetCurrencys').then(response => {
                this.currencyList = response.data;
                const defaultCurrency = this.currencyList.find(currency =>
                    currency.currencyName === 'Ghana Cedis' || currency.currencyName === 'Ghana Cedi'
                );

                if (defaultCurrency) {
                    this.currencyId = defaultCurrency.id;
                }
                this.defaultCurrency = defaultCurrency.id;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get currency.');
            });
        },
        //get status
        getStatus() {
            this.statusList = this.statusList.sort((a, b) => a.name.localeCompare(b.name));
            const defaultStatus = this.statusList.find(status =>
                status.name.toLowerCase() === 'active'
            );
            if (defaultStatus) {
                this.statusId = defaultStatus.id;
            }
            this.defaultStatus = defaultStatus.id;
        },
        //get suppliers by group
        getSuppliersByGroup() {
            axios.get('/SharedResource/GetSuppliersByGroup?groupId=' + this.selectedSuppplierGroupId).then(response => {
                this.supplierList = response.data;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get suppliers.');
            });
        },
        
        //get supplier group details
        getSupplierGroupDetails(id) {
            return this.supplierGroupList.find(a => a.id === id);
        },

        getCurrencyDetails(id) {
            return this.currencyList.find(a => a.id === id);
        },

        getStatusDetails(id) {
            return this.statusList.find(a => a.id === id);
        },
        
        //generateaccountnumber
        generateAccountNumber() {
            return new Promise((resolve, reject) => {
                // Fetch system numbers
                axios.get('/SharedResource/GetSystemNumbers')
                    .then(systemResponse => {
                        const systemNumbers = systemResponse.data;

                        if (systemNumbers.length > 0) {
                            const systemNumber = systemNumbers.find(sn => sn.itemName === 'ApAccountNumbers');
                            this.currentSystemNumber = systemNumber;
                            if (systemNumber) {
                                // Use system number details
                                this.accountNumber = `${systemNumber.prefix}${systemNumber.lastNo}${systemNumber.suffix}`;
                                
                            }
                        }
                        // Fallback if no system number is found
                        const randomNum = Math.floor(100000 + Math.random() * 900000);
                        if (!this.accountNumber) {
                            this.accountNumber = `ACC-${randomNum}/AP`;
                        }

                        resolve(this.accountNumber);
                    })
                    .catch(error => {
                        console.error("Error fetching system numbers:", error);
                        const randomNum = Math.floor(100000 + Math.random() * 900000);
                        this.accountNumber = `ACC-${randomNum}/AP`;
                        resolve(this.accountNumber);
                    });
            });
        },
        
        //render table
        renderTable(responseData) {
            const formattedData = responseData.map(item => ({
                ...item,
                balance: this.formatNumber(item.balance), 
            }));
            $("#dataTable").ejGrid({
                dataSource: formattedData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "accountNumber", headerText: "Account No", width: 65 },
                    { field: "name", headerText: "Supplier Name", width: 80 },
                    { field: "phoneNo", headerText: "Phone No", width: 65 },
                    { field: "email", headerText: "Email", width: 65 },
                    { field: "tinNumber", headerText: "TIN No", width: 65 },
                    { field: "vatNumber", headerText: "Vat No.", width: 65 },
                    { field: "currencyCode", headerText: "Currency Code", width: 65},
                    { field: "balance", headerText: "Balance", width: 65, format: "{0:n2}" },
                    { field: "statusName", headerText: "Status", width: 65 },
                    { field: "address", headerText: "Address", width: 65 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],

                endDelete: (args) => {

                    this.delSupplier(args.data.id);
                },
            });

        },
        
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },

        validateAndSaveSupplier() {
            // Check if the form is valid
            if (this.$refs.supplierForm.checkValidity()) {
                // Proceed with saving the supplier data
                this.saveSupplier();
            } else {
                // If form is invalid, show validation error messages
                this.$refs.supplierForm.reportValidity();
            }
        },
        
        //save supplier
        async saveSupplier() {
            this.isLoading = true;
            let payload = {};
            if (!this.accountNumber) {
                await this.generateAccountNumber();
            }
            payload.accountNumber = this.accountNumber;
            payload.vatNumber = this.vatNumber;
            payload.balance = this.balance;
            payload.tinNumber = this.tinNumber;
            payload.name = this.name;
            payload.email = this.email;
            payload.phoneNo = this.phoneNo;
            payload.address = this.address;
            payload.creditLimit = 0.00;
            payload.isResident = this.isResident;
            payload.taxOffice = this.taxOffice;
            payload.address = this.address;
            payload.contactPerson = this.contactPerson;
            payload.contactPersonPhone = this.contactPersonPhone;
            payload.contactPersonEmail = this.contactPersonEmail;
            if (this.debitAccountId) {
                let debitAccount = this.accountsList.find(a => a.id === this.debitAccountId);
                if (debitAccount) {
                    payload.debitAccountId = debitAccount.id;
                    payload.debitAccountName = debitAccount.accountIdentifier;
                }
                else{
                    payload.debitAccountId = this.emptyGuid;
                    payload.debitAccountName = 'No Ledger Available';
                }
            }
            if (this.creditAccountId) {
                let creditAccount = this.accountsList.find(a => a.id === this.creditAccountId);
                if (creditAccount) {
                    payload.creditAccountId = creditAccount.id;
                    payload.creditAccountName = creditAccount.accountIdentifier;
                }
                else{
                    payload.creditAccountId = this.emptyGuid;
                    payload.creditAccountName = 'No Ledger Available';
                }
            }
            if (this.vatAccountId) {
                let vatAccount = this.accountsList.find(a => a.id === this.vatAccountId);
                if (vatAccount) {
                    payload.vatAccountId = vatAccount.id;
                    payload.vatAccountName = vatAccount.accountIdentifier;
                }
                else{
                    payload.vatAccountId = this.emptyGuid;
                    payload.vatAccountName = 'No Ledger Available';
                }
            }
            if (this.irsAccountId) {
                let irsAccount = this.accountsList.find(a => a.id === this.irsAccountId);
                if (irsAccount) {
                    payload.irsAccountId = irsAccount.id;
                    payload.irsAccountName = irsAccount.accountIdentifier;
                }
                else{
                    payload.irsAccountId = this.emptyGuid;
                    payload.irsAccountName = 'No Ledger Available';
                }
            }
            
            if (this.currencyId) {
                let currencyInfo = this.getCurrencyDetails(this.currencyId);
                if (currencyInfo) {
                    payload.currencyId = currencyInfo.id;
                    payload.currencyName = currencyInfo.currencyName;
                    payload.currencyCode = currencyInfo.currencyCode;
                    payload.buyingRate = currencyInfo.buyRate;
                    payload.sellingRate = currencyInfo.sellRate;
                }
            }
            if(this.supplierGroupId) {
                let supplierGroupInfo = this.getSupplierGroupDetails(this.supplierGroupId);
                if (supplierGroupInfo) {
                    payload.supplierGroupId = supplierGroupInfo.id;
                    payload.supplierGroupName = supplierGroupInfo.name;
                }
            }
            
            payload.statusName = this.statusName;
            payload.statusId = this.statusId;
             if (this.statusId) {
                let statusInfo = this.getStatusDetails(this.statusId);
                if (statusInfo) {
                    payload.statusId = statusInfo.id;
                    payload.statusName = statusInfo.name;
                }
            }
            if (!payload.statusId || !payload.statusName) {
                payload.statusId = this.defaultStatus;
                payload.statusName = this.statusList.find(status => status.id === this.defaultStatus).name;
            }
            if (this.supplierId){
                payload.id = this.supplierId;
                payload.tenantId = this.tenantId;
                axios.post('/SharedResource/UpdateSupplier', payload).then(response => {
                    this.toastHandler('', 'Supplier info updated.');
                    this.isLoading = false;
                    this.clearForm();
                    this.getSuppliers();
                });
            }
            else {
                axios.post('/SharedResource/CreateSupplier', payload).then(response => {
                    if (response.data.code === 200) {

                        this.toastHandler('', 'Supplier data saved.');

                        this.clearForm();

                        this.getSuppliers();

                    }
                    // Update system numbers only if saving was successful
                    if (this.currentSystemNumber) {
                        this.currentSystemNumber.lastNo += 1;
                        axios.post('/SharedResource/UpdateSystemNumber', this.currentSystemNumber)
                            .then(() => {
                                console.log('System number updated successfully.');
                            })
                            .catch(err => {
                                console.error('Failed to update system number:', err);
                            });
                    }
                    else {

                        this.toastHandler('warning', response.data.message);

                    }

                    this.isLoading = false;
                }).catch(err => {
                    this.toastHandler('error', 'Unable to save supplier.');
                    this.isLoading = false;

                });
            }
            
        },
        setCurrentSupplier() {
            let supplierInfo = this.getSupplierDetails(this.supplierId);
            if (supplierInfo) {
                this.accountNumber = supplierInfo.accountNumber;
                this.balance = parseFloat(supplierInfo.balance).toFixed(2);
                this.tinNumber = supplierInfo.tinNumber;
                this.vatNumber = supplierInfo.vatNumber;
                this.name = supplierInfo.name;
                this.email = supplierInfo.email;
                this.phoneNo = supplierInfo.phoneNo;
                this.address = supplierInfo.address;
                this.creditLimit = parseFloat(supplierInfo.creditLimit).toFixed(2);
                this.isResident = supplierInfo.isResident;
                this.currencyId = supplierInfo.currencyId;
                this.supplierGroupId = supplierInfo.supplierGroupId;
                this.statusId = supplierInfo.statusId;
                this.statusName = supplierInfo.statusName;
                this.taxOffice = supplierInfo.taxOffice;
                this.currencyCode = supplierInfo.currencyCode;
                this.contactPerson = supplierInfo.contactPerson;
                this.contactPersonPhone = supplierInfo.contactPersonPhone;
                this.contactPersonEmail = supplierInfo.contactPersonEmail;
                this.supplierId = supplierInfo.id;
                this.tenantId = supplierInfo.tenantId;
                $("#supplierId").ejDropDownList({value: supplierInfo.id});
                // Set the dropdown values for gl accounts
                if (supplierInfo.debitAccountId) {
                    this.debitAccountId = supplierInfo.debitAccountId;
                    this.debitAccountName = supplierInfo.debitAccountName;
                    $("#debitAccountId").ejDropDownList({ value: supplierInfo.debitAccountId });
                }
                if (supplierInfo.creditAccountId) {
                    this.creditAccountId = supplierInfo.creditAccountId;
                    this.creditAccountName = supplierInfo.creditAccountName;
                    $("#creditAccountId").ejDropDownList({ value: supplierInfo.creditAccountId });
                }
                if (supplierInfo.vatAccountId) {
                    this.vatAccountId = supplierInfo.vatAccountId;
                    this.vatAccountName = supplierInfo.vatAccountName;
                    $("#vatAccountId").ejDropDownList({ value: supplierInfo.vatAccountId });
                }
                if (supplierInfo.irsAccountId) {
                    this.irsAccountId = supplierInfo.irsAccountId;
                    this.irsAccountName = supplierInfo.irsAccountName;
                    $("#irsAccountId").ejDropDownList({ value: supplierInfo.irsAccountId });
                }
                
            }
        },
        
        
        delSupplier(id) {

            axios.get('/SharedResource/DelSupplier?id=' + id).then(response => {

                this.getSuppliers();

                this.toastHandler('', 'Supplier info deleted.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to delete supplier.');

            });
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
        supplierId(val) {

            if (val) {

                this.setCurrentSupplier();

            }

        },
        
    },
   mounted(){
        this.initSupplier();
        this.getSuppliers();
        this.getSupplierGroups();
        this.getStatus();
        this.getCurrency();
        this.getDefaultGlSetup();
    },
    
});
app.mount('#app');
     
    