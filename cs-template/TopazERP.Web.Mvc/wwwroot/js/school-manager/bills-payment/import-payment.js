const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            file: null,
            previewRows: [],
            loading: false,
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            uploadFile: null,
            isPreviewLoading: false,
            previewPage: 1,
            previewPerPage: 10,
            students: [],
            academicYears: [],
            academicYearId:'',
            terms: [],
            termId: '',
            classes: [],
            mainClasses: [],
            streams: [],
            levels: [],
            banks: [],
            currencies: [],
            paymentMethods: [],
            accountsList: [],
            defaultAccounts: {},
            debitGlId: '',
            creditGlId: '',
            bankId: '',
            bankBranchId: '',
            paymentMethod: '',
            payments: [],
            selectedPayments: [],
            chequeNumber: '',
            chequeDate: '',
            lockInputs: false,
            importFinished: false,
            isEdit: false,
            paymentId: '',
            studentId: '',
            isMultiCurrency: false,
            isMultiCurrencyEnabled: false,
            selectedPaymentList: [],
            
        }
    },
    computed: {
        hasErrors() {
            return this.previewRows.some(r => r.error);
        },
        paginatedPreviewRows() {
            const start = (this.previewPage - 1) * this.previewPerPage;
            return this.previewRows.slice(start, start + this.previewPerPage);
        },

        totalPreviewPages() {
            return Math.ceil(this.previewRows.length / this.previewPerPage) || 1;
        },
        amountDue() {
            if (!this.studentId) return 0;

            const student = this.students.find(s => s.id === this.studentId);
            const baseBalance = parseFloat(student?.balanceDue) || 0;
            const paymentTotal = this.payments
                .filter(p => {
                    if (p.studentId !== this.studentId) return false;
                    // if editing, exclude the current record and use student actual balance
                    return !(this.isEdit && p.id === this.paymentId);

                })
                .reduce((sum, p) => sum + (parseFloat(p.amountToPaid) || 0), 0);
            return baseBalance - paymentTotal;
        },
        paymentData() {
            return this.payments.map(p => {

                    const student = this.students.find(s => s.id === p.studentId);
                    const currency = this.currencies.find(c => c.id === p.currencyId);
                    const debitAccount = this.accountsList.find(a => a.id === p.debitGlId);
                    const creditAccount = this.accountsList.find(a => a.id === p.creditGlId);
                    const paymentMethod = this.paymentMethods.find(m => m.id === p.paymentMethod);

                    const amountToPaid = parseFloat(p.amountToPaid) || 0;
                    const buyRate = parseFloat(p.buyRate) || 1;
                    const amountDue = parseFloat(p.amountDue) || 0;

                    const convertedAmount = p.isMultiCurrency
                        ? amountToPaid * buyRate
                        : amountToPaid;

                    const newBalance = amountDue - convertedAmount;

                    return {
                        id: p.id,
                        tenantId: p.tenantId,
                        studentId: p.studentId,
                        academicYearId: p.academicYearId,
                        termId: p.termId,
                        classId: p.classId,
                        currencyId: p.currencyId,
                        paymentMethod: p.paymentMethod,

                        debitGlId: p.debitGlId,
                        creditGlId: p.creditGlId,
                        bankGlId: p.bankGlId,

                        bankId: p.bankId,
                        bankBranchId: p.bankBranchId,

                        legalGuardianId: p.legalGuardianId,
                        byLegalGuardian: p.byLegalGuardian,

                        paymentDate: p.paymentDate,
                        batchNumber: p.batchNumber || '—',
                        receiptNumber: p.receiptNumber || '—',
                        referenceNumber: p.referenceNumber,
                        description: p.description,

                        amountDue,
                        amountToPaid,
                        buyRate,
                        convertedAmount,
                        newBalance: newBalance,
                        newBalanceDisplay:
                            newBalance < 0
                                ? `(${Math.abs(newBalance).toFixed(2)})`
                                : newBalance.toFixed(2),
                        isMultiCurrency: p.isMultiCurrency,

                        studentName: student ? student.name : '—',
                        currencyName: currency ? currency.currencyName : '—',
                        debitAccountName: debitAccount ? debitAccount.accountIdentifier : '—',
                        creditAccountName: creditAccount ? creditAccount.accountIdentifier : '—',
                        paymentMethodName: paymentMethod ? paymentMethod.name : '—'
                    };
                });
                
        },
    },
    methods: {
        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        downloadTemplate() {
            window.open(`/SmImportData/DownloadPaymentTemplate`, '_blank');
        },
        onFileUpload(e) {
            const selectedFile = e.target.files[0];

            if (!selectedFile) return;

            this.file = selectedFile;
            this.previewRows = [];

            this.previewFile();
        },
        previewFile() {
            if (!this.file) return;
            this.isPreviewLoading = true;
            let formData = new FormData();
            formData.append("customFile", this.file);
            formData.append("academicYearId", this.academicYearId);
            formData.append("termId", this.termId);
            formData.append("paymentMethod", this.paymentMethod);
            formData.append("debitGlId", this.debitGlId);
            formData.append("creditGlId", this.creditGlId);

            axios.post("/SmImportData/PreviewPayments/", formData)
                .then(res => {
                    this.previewRows = res.data.result || [];
                }).catch(err => {
                toastr.error(err.response?.data?.message || "Preview failed");
                this.previewRows = [];
            })
                .finally(() => {
                    this.isPreviewLoading = false;
                });
        },
        initTable(){
            this.$nextTick(() => {
                this.dataTable(this.paymentData);
            });
        },
        importData() {
            this.importFinished = false;
            const validRows = this.previewRows.filter(x => !x.error);

            if (validRows.length === 0) {
                toastr.warning("No valid records to import");
                return;
            }

            axios.post('/SmImportData/ImportPayments/', validRows)
                .then(res => {
                    const result = res.data?.result.result;

                    if (!result) {
                        toastr.error("Invalid server response");
                        return;
                    }
                    
                    
                    toastr[result.code === 200 ? 'success' : 'error'](result.message);
                    this.importFinished = true;
                    this.previewRows = [];
                    this.getPayments();
                    
                }).catch(err => {
                toastr.error(err.response?.data?.message || "Import failed");
                this.previewRows = [];
            });

        },

        loadData() {
            axios.all([
                axios.get('/SmBillingAndPayments/GetPayments/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/SharedResource/GetBanks'),
                axios.get('/SharedResource/GetCurrencys'),
                axios.get(`/jsonDataSample/paymentMethods.json?v=${new Date().getTime()}`),
                axios.get('/LedgerSetups/GetChartOfAccountDetails'),
                axios.get('/SmBillingAndPayments/GetPaymentAccounts/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
            ]).then(axios.spread((payments, years, term, classes, mainClasses, streams, levels, banks, currencies,paymentMethods, accounts, defaultAccounts, students ) => {

                this.students = students.data;
                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName} `.trim();
                });
                this.academicYears = years.data;
                this.terms = term.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.levels = levels.data;
                this.banks = banks.data;
                this.currencies = currencies.data;
                this.paymentMethods = paymentMethods.data;
                this.payments = payments.data.filter(p => !p.isCanceled && !p.isProcessed && !p.isPosted );
                this.payments.forEach(p => {
                    p.paymentDate = this.formatDate(p.paymentDate);
                });
                this.accountsList = accounts.data.accountDetails;
                this.defaultAccounts = defaultAccounts.data[0];
                if (!this.accountsList || this.accountsList.length === 0) {
                    this.accountsList = [{
                        id: this.emptyGuid,
                        accountIdentifier: 'No Ledger Available'
                    }];
                } else {
                    this.accountsList.forEach(v => {
                        v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;
                    });
                    this.accountsList.sort((a, b) => Number(a.accountNo) - Number(b.accountNo));
                }
                this.initDropdowns();
            }));
        },
        getBankDetails(id)
        {
            return this.banks.find(a => a.id === id);
        },
        getBankBranchDetails(id)
        {
            return this.bankBranches.find(a => a.id === id);
        },
        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }
            if (this.defaultAccounts) {
                const defaultDebitAccount = this.accountsList.find(
                    a => a.id === this.defaultAccounts.localDebitGlId
                );

                if (defaultDebitAccount) {
                    this.debitGlId = defaultDebitAccount.id;
                }

                const defaultCreditAccount = this.accountsList.find(
                    a => a.id === this.defaultAccounts.localCreditGlId
                );

                if (defaultCreditAccount) {
                    this.creditGlId = defaultCreditAccount.id;
                }
            }
            const defaultPaymentMethod = this.paymentMethods.find(p => p.id === 1);

            if (defaultPaymentMethod) {
                this.paymentMethod = defaultPaymentMethod.id;
            }
        },
        getSelectedPayments() {
            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedPaymentList = [];
            let check = obj.checkSelectedRowsIndexes;
            if (check.length) {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.selectedPaymentList = rec;

        },
        getRecords(pageInx, inx, proxy, rec) {

            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;
        },
        
        formatMoney(value) {
            return Number(value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        dataTable(paymentData)
        {
            $("#dataTable").ejGrid({
                dataSource: paymentData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowScrolling: true,
                scrollSettings: { width: "100%" },
                selectionSettings: {
                    selectionMode: ej.Grid.SelectionMode.Multiple,
                    selectionType: ej.Grid.SelectionType.CheckBox
                },
                toolbarSettings: {showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search]},
                columns: [
                    {field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true},
                    { type: "checkbox", width: 20 },
                    {field: "studentName", headerText: "Student", textAlign: ej.TextAlign.Left, width: 140},
                    {field: "paymentDate", headerText: "Date", width: 80, format: "{0:yyyy-MM-dd}"},
                    {field: "batchNumber", headerText: "Batch #", width: 80},
                    {field: "amountDue", headerText: "Amt Due", width: 80, format: "{0:n2}"},
                    {field: "amountToPaid", headerText: "Amount", width: 80, format: "{0:n2}"},
                    {field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 80},
                    {field: "buyRate", headerText: "Rate", width: 40, format: "{0:n4}"},
                    {field: "convertedAmount", headerText: "FX Amt", width: 80, format: "{0:n2}"},
                    {field: "newBalanceDisplay", headerText: "Balance", width: 80, format: "{0:n2}"},
                    {field: "tenantId", visible: false, headerText: "Tenant Id", width: 15}
                ],
            });
        },
        getPayments() {
            this.isLoading = true;
            axios.get('/SmBillingAndPayments/GetPayments')
                .then(response => {
                    this.payments = response.data.filter(p => !p.isCanceled && !p.isProcessed && !p.isPosted )
                    this.initTable();
                    this.isLoading = false;
                })
                .catch(error => {
                    this.toastHandler('error', 'Failed to fetch payments.');
                })
        },
        async processPayments() {
            this.getSelectedPayments();

            if (!this.selectedPaymentList.length) {
                this.toastHandler('warning', 'Please select payments to post.');
                return;
            }

            this.isLoading = true;

            let payload = {
                paymentIds: this.selectedPaymentList.map(a => a.id)
            };
            const result = await Swal.fire({
                title: 'Confirm',
                html: `
                <div style="text-align:center">
                    <p>Are you sure you want to process selected payments?</p>
                    <p style="color: #f00a0a"><strong><i class="la la-exclamation-circle"></i> This action cannot be reversed</strong></p>
                </div>
            `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Proceed',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return;
            }
            axios.post('/SmBillingAndPayments/ProcessPayments', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', response.data.message);
                        this.getPayments();
                    } else {
                        this.toastHandler('warning', response.data.message);
                    }
                    this.isLoading = false;
                    $('#addEdit').modal('hide');
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to post payment.');
                    this.isLoading = false;
                });
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
        bankId(val) {
            if (val) {
                const bankInfo = this.getBankDetails(val);

                if (bankInfo) {
                    this.bankBranches = [...bankInfo.bankBranches].sort((a, b) => {
                        const nameA = a?.name || "";
                        const nameB = b?.name || "";
                        return nameA.localeCompare(nameB);
                    });
                    $("#bankBranchId").ejDropDownList({
                        dataSource: this.bankBranches,
                        watermarkText: "Select Branch",
                        width: "100%",
                        fields: { id: "id", text: "name", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.bankBranchId = args.value;
                        }
                    });

                    this.$nextTick(() => {
                        if (this.bankBranchId) {
                            $("#branchId").ejDropDownList("option", "value", this.bankBranchId);
                        }
                    });
                }
            }
        },
    },
    async mounted() {
        await this.loadData();
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');