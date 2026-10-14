const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            detailsList: [],
            customerList: [],
            customerId: '',
            customerName: '',
            accountNumber: '',
            currencyList: [],
            currencyId: '',
            referenceNumber: '',
            description: '',
            unitPrice: '0',
            quantity: '0',
            subTotal: ' 0',
            paidAmount: '0',
            vatAmount: '0',
            minorName: '',
            debitAccountList: [],
            debitAccountId: '',
            address: '',
            buyRate: '',
            quotationNumber: '',
            notes: '',
            isConvertedToInvoice: false,
            quotationDate: moment().format("YYYY-MM-DD"),
            discountAsPercentage: false,
            discount: '0',
            debitAccountName: '',
            taxLevyList: [],
            vatId: '',
            vatName: 'None',
            vat: [],
            otherTaxLevyList: [],
            vatRate: '0',
            vatIsApplied: false,
            detailsId: '',
            computedTaxLevies: [],
            quotationList: [],
            quotationId: '',
            totalInvoiceAmount: '',
            status: 0,
            vatGl: '',
            covidGl: '',
            nhilGl: '',
            getflGl: '',
            cstGl: '',
            creditAccountId: '',
            creditAccountName: '',
            liabilityAccountId: '',
            liabilityAccountName: '',
            ouId: '',
            isOu: false,
            ouList: [],
            ouName: '',
            tenantId: '',
            isInvoiceQuotation: false
        }
    },
    methods:{
        initQuotation(){

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


              

                

            }).catch(err => {

                this.toastHandler('error', 'Voucher initialization failed.');

            });
        },
        getDefaultGlSetup() {

            axios.get('/LedgerSetups/GetDefaultGlSetup').then(response => {

                let responseData = response.data;
                this.creditAccountId = responseData.accountsReceivableAccountId;
                this.debitAccountId = responseData.accountsPayableAccountId;
                this.vatGl = responseData.vatPaidAccountId;
                this.covidGl = responseData.covidTaxPaidAccountId;
                this.nhilGl = responseData.nhilPaidAccountId;
                this.getflGl = responseData.getflPaidAccountId;
                this.cstGl = responseData.vatPaidAccountId;
                if (responseData) {

                    this.id = responseData.id;

                    $("#liabilityAccountId").ejDropDownList({

                        value: responseData.accountsReceivableAccountId,

                    });

                }
                $("#quotationDate").ejDatePicker({
                    width: "100%",
                    dateFormat: "yyyy-MM-dd",
                    value: moment().add(1, 'months').format("YYYY-MM-DD"),
                    change: (args) => {
                        this.quotationDate = args.value;
                    }
                });


            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get default GL numbers.');

            });
        },
        toggleOu(){
            this.isOu = !this.isOu;
        },
        getTaxLevies() {
            axios.get('/SharedResource/GetTaxLevies').then(response => {
                this.taxLevyList = response.data;
                if (this.taxLevyList.length > 0) {
                    let vat = this.taxLevyList.find(tax => tax.type === 'vat');
                    this.vatRate = parseFloat(vat.rate).toFixed(2);
                    this.vatList = this.taxLevyList.filter(tax => tax.type === 'vat');
                }
            }).catch(err => {

                this.toastHandler('error', 'Unable to get tax levies.');

            });
        },
        toggleTaxLevy(taxId) {
            const selectedTax = this.taxLevyList.find(t => t.id === taxId);
            if (!selectedTax) return;

            const isCST = selectedTax.name === 'CST' && selectedTax.type.toLowerCase() === 'others';
            const isVAT = selectedTax.name === 'VAT' && selectedTax.type.toLowerCase() === 'vat';

            // Update isApplied state
            this.taxLevyList = this.taxLevyList.map(tax => {
                if (isCST || isVAT) {
                    const isOther = (tax.name === 'CST' && tax.type.toLowerCase() === 'others') ||
                        (tax.name === 'VAT' && tax.type.toLowerCase() === 'vat');

                    if (isOther) {
                        const newAppliedState = tax.id === taxId ? !selectedTax.isApplied : false;

                        // If this tax is being turned OFF, remove it from table
                        if (!newAppliedState) {
                            this.detailsList = this.detailsList.filter(
                                detail => detail.description !== tax.name
                            );
                        }

                        return { ...tax, isApplied: newAppliedState };
                    }
                }
                return tax.id === taxId
                    ? { ...tax, isApplied: !tax.isApplied }
                    : tax;
            });
            let debitAccountId = this.emptyGuid;
            let debitAccountName = '';

            switch (selectedTax.name.toUpperCase()) {
                case "VAT":
                    debitAccountId = this.vatGl;
                    break;
                case "NHIL":
                    debitAccountId = this.nhilGl;
                    break;
                case "GETFL":
                    debitAccountId = this.getflGl;
                    break;
                case "COVID":
                    debitAccountId = this.covidGl;
                    break;
                case "CST":
                    debitAccountId = this.cstGl;
                    break;
            }

            const selectedAccount = this.accountsList.find(a => a.id === debitAccountId);
            if (selectedAccount) {
                debitAccountName = selectedAccount.accountIdentifier;
            }

            const commonRefNo = this.detailsList.length > 0
                ? this.detailsList[0].referenceNo
                : `REF-${Date.now()}`;

            if (!selectedTax.isApplied) {
                // Calculate total before tax (excluding tax rows)
                const taxNames = ["VAT", "NHIL", "GETFL", "COVID", "CST"];
                const totalBeforeTax = this.detailsList
                    .filter(d => !taxNames.includes(d.description))
                    .reduce((sum, d) => sum + parseFloat(d.subTotal || 0), 0);

                let taxAmount = 0;
                if (isVAT) {
                    const otherTaxLevies = this.taxLevyList.filter(t => t.isApplied && t.type !== 'vat');
                    const sumOtherTaxAmounts = otherTaxLevies.reduce((sum, t) => {
                        return sum + ((t.rate / 100) * totalBeforeTax);
                    }, 0);
                    taxAmount = (this.vatRate / 100) * (totalBeforeTax + sumOtherTaxAmounts);
                }
                else {
                    taxAmount = (selectedTax.rate / 100) * totalBeforeTax;
                }

                const taxDetail = {
                    id: this.uuid(),
                    referenceNo: commonRefNo,
                    description: selectedTax.name, // only name
                    debitAccountId: debitAccountId,
                    debitAccountName: debitAccountName,
                    quantity: 1,
                    unitPrice: taxAmount.toFixed(2),
                    discount: 0,
                    amount: 0,
                    subTotal: taxAmount.toFixed(2)
                };

                this.detailsList.push(taxDetail);
                console.log(taxDetail);
            } else {
                // Remove tax row by name
                this.detailsList = this.detailsList.filter(
                    detail => detail.description !== selectedTax.name
                );
            }

            // Ensure VAT is always last
            const vatIndex = this.detailsList.findIndex(d => d.description === "VAT");
            if (vatIndex >= 0 && vatIndex !== this.detailsList.length - 1) {
                const [vatRow] = this.detailsList.splice(vatIndex, 1);
                this.detailsList.push(vatRow);
            }

            this.Table();
            this.computeTotalTaxAmount();
        },
        computeTotalTaxAmount() {
            this.computedTaxLevies = [];
            let hasAppliedTax = this.taxLevyList.some(tax => tax.isApplied);

            if (hasAppliedTax) {
                const taxNames = ["VAT", "NHIL", "GETFL", "COVID", "CST"];

                // Total excluding tax rows
                const totalBeforeTaxRows = this.detailsList
                    .filter(d => !taxNames.includes(d.description))
                    .reduce((acc, detail) => acc + parseFloat(detail.subTotal), 0);

                let otherTaxLevies = this.taxLevyList.filter(tax => tax.isApplied && tax.type !== 'vat');

                // Calculate non-VAT taxes
                otherTaxLevies.forEach(v => {
                    const taxAmount = (v.rate * totalBeforeTaxRows) / 100;
                    this.computedTaxLevies.push({
                        name: v.name,
                        rate: v.rate,
                        isApplied: true,
                        amount: taxAmount
                    });

                    // Update tax rows in detailsList
                    let taxDetail = this.detailsList.find(d => d.description === v.name);
                    if (taxDetail) {
                        taxDetail.unitPrice = taxAmount.toFixed(2);
                        taxDetail.subTotal = taxAmount.toFixed(2);
                    }
                });

                // Sum their rates
                let totalTaxRate = otherTaxLevies.reduce((acc, tax) => acc + parseFloat(tax.rate), 0);

                // Compute total tax amount
                let totalTaxAmount = totalBeforeTaxRows * totalTaxRate / 100;
                let totalBeforeVat = totalBeforeTaxRows + totalTaxAmount;

                // If VAT is applied
                let vat = this.taxLevyList.find(tax => tax.isApplied && tax.type === 'vat');
                if (vat) {
                    this.vatAmount = totalBeforeVat * parseFloat(this.vatRate) / 100;
                    this.totalInvoiceAmount = (totalBeforeVat + this.vatAmount).toFixed(2);

                    this.computedTaxLevies.push({
                        name: vat.name,
                        rate: vat.rate,
                        amount: this.vatAmount,
                        isApplied: true
                    });

                    // Update VAT row in detailsList
                    let vatDetail = this.detailsList.find(d => d.description === vat.name);
                    if (vatDetail) {
                        vatDetail.unitPrice = this.vatAmount.toFixed(2);
                        vatDetail.subTotal = this.vatAmount.toFixed(2);
                    }
                } else {
                    this.totalInvoiceAmount = totalBeforeVat.toFixed(2);
                }
            } else {
                // No taxes applied — total is sum of subTotals
                this.computedTaxLevies = [];
                this.totalInvoiceAmount = this.detailsList.reduce(
                    (acc, detail) => acc + parseFloat(detail.subTotal), 0
                ).toFixed(2);
            }
        },
        getQuotations() {
            return axios.get('/ArDataEntry/GetQuotations').then(response =>
            {
                this.quotationList = response.data.filter(q => q.isConvertedToInvoice === false);
                   
                this.quotationList.forEach((quotation) =>
                {
                    quotation.quotationIdId = quotation.id;
                    quotation.buyRate = parseFloat(quotation.buyRate).toFixed(4);
                    quotation.displayText = `${quotation.customerName} - ${quotation.quotationNumber}`;

                });
                $("#quotationId").ejDropDownList({
                    dataSource: this.quotationList,
                    watermarkText: "Select Quotation Number",
                    width: "100%",
                    fields: { id: "id", text: "displayText", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.quotationId = args.value;
                    }
                });
                return this.quotationList;
            })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get quotations.');
                    throw err;
                });
        },
        getQuotationdetails(id) {
            return this.quotationList.find(a => a.id === id);
        },
        Table() {
            $("#dataTable2").ejGrid({
                dataSource: this.detailsList,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: { pageSize: 10 },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true, showConfirmDialog: true},
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true, width: 80 },
                    { field: "referenceNo", headerText: 'Ref No', textAlign: ej.TextAlign.Left, width: 60 },
                    { field: "description", headerText: "Description", width: 80, validationRules: { required: true, }  },
                    {
                        field: "debitAccountId",
                        headerText: "Debit G/L",
                        width: 80,
                        editType: ej.Grid.EditingType.DropDown,
                        foreignKeyField: "id",
                        foreignKeyValue: "accountIdentifier",
                        dataSource: this.accountsList,
                        editParams: {
                            dataSource: this.accountsList,
                            fields: { text: "accountIdentifier", value: "id" }
                        },
                        validationRules: { required: true }
                    },
                    { field: "quantity", headerText: "Quantity", width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, validationRules: { required: true, min: 0, max: 100000 } },
                    { field: "unitPrice", headerText: "Unit Price", width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", validationRules: { required: true, min: 0, max: 100000 }},
                    { field: "discount", headerText: "Disc. %", width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}"},
                    { field: "amount", headerText: "Disc. Amt.", width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", allowEditing: false},
                    { field: "subTotal", headerText: "Sub Total", width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", allowEditing: false},
                ],
                actionBegin: (args) => {
                    if (args.requestType === "add") {

                        args.data = args.data || {};
                        args.data.debitAccountId = this.debitAccountId;
                        if (this.detailsList.length > 0) {

                            args.data.referenceNo = this.detailsList[0].referenceNo;
                        } else {

                            args.data.referenceNo = "";
                        }
                        const selectedAccount = this.debitAccountList.find(a => a.id === this.debitAccountId);
                        if (selectedAccount) {
                            args.data.debitAccountName = selectedAccount.accountIdentifier;
                        }
                    }

                },
                endAdd: (args) => {

                    if (!args.data.debitAccountId || args.data.debitAccountId === this.emptyGuid) {
                        args.data.debitAccountId = this.debitAccountId;
                    }
                    const selectedAccount = this.debitAccountList.find(a => a.id === args.data.debitAccountId);
                    if (selectedAccount) {
                        args.data.debitAccountName = selectedAccount.accountIdentifier;
                    } else {
                        args.data.debitAccountName = "unknown";
                    }
                    this.addInvoiceDetail(args.data);
                },
                endEdit: (args) => {
                    args.data.debitAccountId = args.data.debitAccountId || this.emptyGuid;
                    const selectedAccount = this.debitAccountList.find(a => a.id === args.data.debitAccountId);
                    if (selectedAccount) {
                        args.data.debitAccountName = selectedAccount.accountIdentifier;
                    } else {
                        args.data.debitAccountName = "unknown";
                    }
                    this.updateInvoiceDetail(args.data);
                },
                endDelete: (args) => {

                    this.deleteInvoiceDetail(args.data);
                },
            });
        },
        setTable(quotationId) {
            let quotation = this.quotationList.find(a => a.id === quotationId);
            if (quotation)
            {
                this.Table([quotation]);
            }else
            {
                this.Table([]);
            }
        },
        getQuotationDetails(id) {
            return this.detailsList.find(a => a.id === id);
        },
        getCustomers() {
            axios.get('/SharedResource/GetCustomers').then(response =>
            {
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
            }).catch(err =>
            {
                this.toastHandler('error', 'Unable to get customers.');
            });
        },
        getCustomerDetails(id) {
            return this.customerList.find(a => a.id === id);
        },
        setCurrentCustomer() {
            let customerInfo = this.getCustomerDetails(this.customerId);
            if (customerInfo)
            {
                this.accountNumber = customerInfo.accountNumber;
                this.balance = customerInfo.balance;
                this.name = customerInfo.name;
                this.customerId = customerInfo.id;
                this.address = customerInfo.address;
                $("#customerId").ejDropDownList({value: customerInfo.id});
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
        getCurrencyDetails(id) {
            return this.currencyList.find(a => a.id === id);
        },
        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");
        },
        setCurrentQuotation() {
            let quotationInfo = this.getQuotationdetails(this.quotationId);
            if (quotationInfo) {
                this.taxLevyList = this.taxLevyList.map(tax => ({ ...tax, isApplied: false }));
                this.quotationId = quotationInfo.id;
                this.quotationNumber =quotationInfo.quotationNumber;
                this.quotationDate = this.formatDate(quotationInfo.quotationDate);
                this.currencyId =quotationInfo.currencyId;
                this.currencyName =quotationInfo.currencyName;
                this.customerId = quotationInfo.customerId;
                this.customerName = quotationInfo.customerName;
                this.accountNumber = quotationInfo.accountNumber;
                this.notes = quotationInfo.notes;
                this.referenceNumber = quotationInfo.referenceNumber;
                this.description = quotationInfo.description;
                this.debitAccountId = quotationInfo.debitAccountId;
                this.address = quotationInfo.address;
                this.tenantId = quotationInfo.tenantId;
                this.isConvertedToInvoice = !!quotationInfo.isConvertedToInvoice;
                this.isInvoiceQuotation = !!quotationInfo.isConvertedToInvoice;
                if (quotationInfo.isConvertedToInvoice){
                    this.isConvertedToInvoice = true
                }
                else {
                    this.isConvertedToInvoice = false
                }
                this.detailsList = quotationInfo.details;
                this.totalInvoiceAmount = this.totalInvoiceAmount;
                this.buyRate = parseFloat(quotationInfo.buyRate).toFixed(4);
                $("#quotationId").ejDropDownList({value: quotationInfo.id});
                //toggle the tax levies that are in TaxLevies
                if (quotationInfo.taxLevies.length > 0)
                {
                    quotationInfo.taxLevies.forEach(v => {
                        this.taxLevyList = this.taxLevyList.map(tax => tax.name === v.name ? { ...tax, isApplied: true } : tax);
                    });
                }
            }
        },
        createInvoice() {
            if (!this.isConvertedToInvoice) return;
            this.isLoading = true;
            let invoiceDetails = this.detailsList.map(detail => {
                return {
                    ...detail,
                    creditAccountId: detail.debitAccountId,
                    creditAccountName: detail.debitAccountName,
                };
            });
            let payload = {
                invoiceNumber: '0',
                invoiceDate: this.quotationDate,
                projectedPayDate: this.projectedPayDate,
                balance: this.totalInvoiceAmount,
                purchaseOrderNumber: this.quotationNumber,
                voucherNumber: '000000',
                totalInvoiceAmount: this.totalInvoiceAmount,
                batchNumber: this.batchNumber,
                newVatRate: 0.00,
                paidAmount: 0.00,
                invoiceTaxLevies: this.computedTaxLevies,
                vatRate: this.vatRate,
                vatAmount: this.vatAmount,
                liabilityAccountId: this.liabilityAccountId,
                liabilityAccountName: this.liabilityAccountName,
                details: invoiceDetails,
            };
            if (this.currencyId) {
                let currencyInfo = this.getCurrencyDetails(this.currencyId);
                if (currencyInfo) {
                    payload.currencyId = currencyInfo.id;
                    payload.currencyName = currencyInfo.currencyName;
                    payload.currencyCode = currencyInfo.currencyCode;
                    payload.minorName = currencyInfo.minorName;
                    payload.buyRate = this.buyRate;
                    payload.sellRate = currencyInfo.sellRate;
                }
            }
            if (this.ouId && this.isOu) {
                let ouInfo = this.getDepartmentDetails(this.ouId);
                if (ouInfo) {
                    payload.ouId = ouInfo.id;
                    payload.ouName = ouInfo.name;
                }
            } else {
                payload.ouId = this.emptyGuid;
                payload.ouName = '';
            }

            if (this.customerId) {
                let customerInfo = this.getCustomerDetails(this.customerId);
                if (customerInfo) {
                    payload.customerId = customerInfo.id;
                    payload.customerName = customerInfo.name;
                    payload.accountNumber = customerInfo.accountNumber;

                    if (customerInfo.creditLimit > 0 && this.totalInvoiceAmount > customerInfo.creditLimit) {
                        this.toastHandler('warning', `Total invoice amount exceeds the credit limit of ${customerInfo.creditLimit}. Please adjust.`);
                        this.isLoading = false;
                        return;
                    }
                }
            }

            axios.post('/ArDataEntry/CreateInvoice', payload)
                .then(async response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'Invoice created.');
                        this.getQuotations();
                        this.isLoading = false;
                        $('#createInvoice').modal('hide');
                    } else {
                        this.toastHandler('error', response.data.message);
                        this.isLoading = false;
                        $('#createInvoice').modal('hide');
                    }
                })
                
        },

        resetModal() {

            this.modalTitle = 'Confirm Action';
            this.name = '';
            this.displayName = '';

        },
        saveQuotation() {
            this.isLoading = true;
            let payload = {};
            if (this.quotationNumber === null || this.quotationNumber === '')
            {
                payload.quotationNumber = '0';
            }
            payload.quotationNumber = this.quotationNumber;
            payload.isConvertedToInvoice = this.isConvertedToInvoice;
            payload.quotationDate = this.quotationDate;
            payload.notes = this.notes;
            payload.taxLevies = this.computedTaxLevies;
            if (this.currencyId) {
                let currencyInfo = this.getCurrencyDetails(this.currencyId);
                if (currencyInfo)
                {
                    payload.currencyId = currencyInfo.id;
                    payload.currencyName = currencyInfo.currencyName;
                    payload.currencyCode = currencyInfo.currencyCode;
                    payload.buyRate = this.buyRate;
                }
            }
            if (this.customerId) {
                let customerInfo = this.getCustomerDetails(this.customerId);
                if (customerInfo)
                {
                    payload.customerId = customerInfo.id;
                    payload.customerName = customerInfo.name;
                    payload.accountNumber = customerInfo.accountNumber;
                    payload.address = customerInfo.address;
                }
            }
            payload.details = this.detailsList;
           
            const isUpdating = !!this.quotationId;
            if (isUpdating)
            {
                payload.id = this.quotationId;
                payload.tenantId = this.tenantId;
                axios.post('/ArDataEntry/UpdateQuotation', payload)
                    .then(async response => {
                        this.quotationId = payload.id;
                        this.toastHandler('', 'Quotation updated.');
                        await this.getQuotations();
                        this.setCurrentQuotation();
                        this.setTable(this.quotationId);
                        console.log(this.isConvertedToInvoice);
                        if (this.isConvertedToInvoice && !this.isInvoiceQuotation) {
                            this.createInvoice();
                        }

                        this.isLoading = false;
                        $('#addEdit').modal('hide');
                    })
                    .catch(err => {
                        this.toastHandler('error', 'Unable to update quotation.');
                        this.isLoading = false;
                        $('#addEdit').modal('hide');
                    });

            }else{
                axios.post('/ArDataEntry/CreateQuotation', payload)
                    .then(async response => {
                        if (response.data.code === 200) {
                            this.toastHandler('', 'Quotation saved.');
                            await this.getQuotations();
                            this.setCurrentQuotation();
                            this.setTable(this.quotationId);
                            console.log(this.isConvertedToInvoice);
                            if (this.isConvertedToInvoice) {
                                this.createInvoice();
                            }
                            this.isLoading = false;
                            $('#addEdit').modal('hide');
                        } else {
                            this.toastHandler('error', response.data.message);
                            this.isLoading = false;
                            $('#addEdit').modal('hide');
                        }
                    })
                    .catch(err => {
                        this.toastHandler('error', 'Unable to save quotation.');
                    });

            }

        },
        
        computeSubTotal(quantity, unitPrice, amount) {
            let parsedQuantity = parseFloat(quantity) || 0;
            let parsedUnitPrice = parseFloat(unitPrice) || 0;
            let parsedAmount =parseFloat(amount) || 0;
            return ((parsedQuantity * parsedUnitPrice) - parsedAmount).toFixed(2);
        },
        addInvoiceDetail(payload) {
            payload.id = this.uuid();
            if (payload.unitPrice && payload.quantity && payload.discount === 0){
                payload.unitPrice = parseFloat(payload.unitPrice).toFixed(2);
                payload.discount = parseFloat(payload.discount).toFixed(2);
                payload.subTotal = parseFloat(payload.unitPrice * payload.quantity).toFixed(2);
                payload.amount = 0;
            }
            else if (payload.unitPrice && payload.quantity && payload.discount > 0) {
                payload.discountAsPercentage = true;
                payload.unitPrice = parseFloat(payload.unitPrice).toFixed(2);
                payload.discount = parseFloat(payload.discount).toFixed(2);
                payload.subTotal = parseFloat(payload.unitPrice * payload.quantity).toFixed(2);
                payload.amount = (payload.discount * payload.subTotal) / 100;
                payload.subTotal = parseFloat(payload.subTotal - payload.amount).toFixed(2);
            }


            payload.subTotal = this.computeSubTotal(payload.quantity, payload.unitPrice, payload.amount);
            const taxDescriptions = ["VAT", "NHIL", "GETFL", "COVID", "CST"];

            // Find the first tax row index
            const taxStartIndex = this.detailsList.findIndex(
                d => taxDescriptions.some(tax => d.description?.toUpperCase().startsWith(tax))
            );

            if (taxStartIndex !== -1) {
                // Insert before the first tax levy
                this.detailsList.splice(taxStartIndex, 0, payload);
            } else {
                // No taxes yet → push to end
                this.detailsList.push(payload);
            }

            this.Table();
            this.computeTotalTaxAmount();
        },
        updateInvoiceDetail(payload) {
            payload.invoiceId = this.invoiceId;
            payload.id = this.detailsId || payload.id;
            let existingDetail = this.detailsList.findIndex(d => d.id === payload.id);

            if (existingDetail !== -1) {
                payload.unitPrice = parseFloat(payload.unitPrice) || 0;
                payload.quantity = parseFloat(payload.quantity) || 0;
                payload.discount = parseFloat(payload.discount) || 0;
                payload.unitPrice = payload.unitPrice.toFixed(2);
                payload.discount = payload.discount.toFixed(2);

                let subTotalBeforeDiscount = parseFloat(payload.unitPrice * payload.quantity).toFixed(2);
                if (payload.discount > 0) {
                    payload.discountAsPercentage = true;
                    payload.amount = (payload.discount * subTotalBeforeDiscount) / 100;
                    payload.subTotal = (subTotalBeforeDiscount - payload.amount).toFixed(2);
                } else {
                    payload.amount = 0;
                    payload.subTotal = subTotalBeforeDiscount;
                }

                payload.subTotal = this.computeSubTotal(payload.quantity, payload.unitPrice, payload.amount);
                const taxDescriptions = ["VAT", "NHIL", "GETFL", "COVID", "CST"];

                // Remove existing detail
                this.detailsList.splice(existingDetail, 1);
                const taxStartIndex = this.detailsList.findIndex(
                    d => taxDescriptions.some(tax => d.description?.toUpperCase().startsWith(tax))
                );

                if (taxStartIndex !== -1) {
                    // Insert before the first tax levy
                    this.detailsList.splice(taxStartIndex, 0, payload);
                } else {
                    // No taxes yet → push to end
                    this.detailsList.push(payload);
                }
            }

            this.Table();
            this.computeTotalTaxAmount();
        },

        deleteInvoiceDetail(payload) {
            this.detailsList = this.detailsList.filter(detail => detail.id !== payload.id);

            this.computeTotalTaxAmount();
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        deleteQuotation(id) {
            this.isLoading = true;
            id = this.quotationId;
            axios.post(`/ArDataEntry/DeleteQuotation?id=${this.quotationId}`, { id: this.quotationId })
                .then(async response => {
                        this.toastHandler('success', 'Quotation deleted.');
                        await this.getQuotations();
                        this.clearForm();
                        this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to delete quotation.');
                    this.isLoading = false;
                });
        },
        clearForm() {
            window.location.reload();
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
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
        printReport() {
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

            let url = `/ArReports/GetQuotationInPdf?id=${this.quotationId}`;

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
                    this.toastHandler("error", "Unable to load the quotation. Please try again.");
                    printWindow.close();
                    this.isLoading = false;
                });
        }
      

    },
    watch: {
        customerId(val) {
            if (val)
            {
                this.setTable(this.quotationId);
                this.setCurrentCustomer();
            }
        },
        quotationId(val) {
            if (val)
            {
                this.setCurrentQuotation();
                this.computeTotalTaxAmount()
                this.setTable(val);
                let quotationInfo = this.getQuotationdetails(val);
                if (quotationInfo)
                {
                    this.quotationNumber = quotationInfo.quotationNumber;
                }
            }
        },
        currencyId(val) {
            let currencyInfo = this.getCurrencyDetails(val)
            this.buyRate = parseFloat(currencyInfo.buyRate).toFixed(4);
        },
        
    },

   mounted() {
        this.initQuotation();
        this.getTaxLevies();
        this.getQuotations();
        this.getCustomers();
        this.getCurrency();
        this.getDefaultGlSetup();
       
    }
});
app.mount('#app');