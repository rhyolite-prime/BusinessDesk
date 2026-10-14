const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            levels: [],
            academicYearId: '',
            termId: '',
            classId: '',
            levelId:'',
            amountToPaid: 0.00,
            currencies: [],
            currencyId: '',
            buyRate: 0,
            paymentDate: new Date().toISOString().substr(0, 10),
            activeTab: 'create',
            foundExisting: false,
            studentBills: [],
            referenceNumber:'',
            paymentMethod: 1,
            studentId: '',
            batchNumber: '',
            bankGlId: this.emptyGuid,
            banks:[],
            bankId:'',
            bankBranchId: '',
            chequeNumber: '',
            chequeDate: new Date().toISOString().substr(0, 10),
            description: 'Bill Payment',
            isCanceled: false,
            isProcessed: false,
            receiptNumber:'',
            legalGuardianId:this.emptyGuid,
            byLegalGuardian:false,
            creditGlId: '',
            debitGlId: '',
            isMultiCurrency: false,
            paymentMethods:[],
            tenantId: null,
            payments: [],
            bankBranches:[],
            accountsList: [],
            defaultAccounts: [],
            selectedPayments:[],
            paymentId : null,
            amountDueValue: 0,
            isEdit: false,
            page: 1,
            perPage: 10,
            searchText: '',
            isShimmerLoading: false,
            studentList: [],
            classList: [],
            reportApiBaseUrl: '',
            isLoading: false,
            balance: 0,
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1783949137/erp-reports/school-manager/SchPaymentReceipt_ht803d.rdl',
            },
        }
    },
    computed: {
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
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
            const data = this.payments.map(p => {

                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const bankAccount = this.accountsList.find(a => a.id === p.bankGlId);
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
                    chequeNumber: p.chequeNumber,
                    chequeDate: p.chequeDate,
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
                    bankAccountName: bankAccount ? bankAccount.accountIdentifier : '—',
                    debitAccountName: debitAccount ? debitAccount.accountIdentifier : '—',
                    creditAccountName: creditAccount ? creditAccount.accountIdentifier : '—',
                    paymentMethodName: paymentMethod ? paymentMethod.name : '—'
                };
            });

            if (!this.searchText) {
                return data;
            }

            const search = this.searchText.toLowerCase().trim();

            return data.filter(p =>
                (p.studentName || '').toLowerCase().includes(search) ||
                (p.receiptNumber || '').toLowerCase().includes(search) ||
                (p.referenceNumber || '').toLowerCase().includes(search) ||
                (p.batchNumber || '').toLowerCase().includes(search) ||
                (p.paymentMethodName || '').toLowerCase().includes(search) ||
                (p.currencyName || '').toLowerCase().includes(search) ||
                (p.bankAccountName || '').toLowerCase().includes(search) ||
                (p.debitAccountName || '').toLowerCase().includes(search) ||
                (p.creditAccountName || '').toLowerCase().includes(search) ||
                (p.description || '').toLowerCase().includes(search) ||
                (p.amountDue || '').toString().includes(search) ||
                (p.amountToPaid || '').toString().includes(search) ||
                (p.buyRate || '').toString().includes(search) ||
                (p.convertedAmount || '').toString().includes(search) ||
                (p.newBalance || '').toString().includes(search)
            );
        },
        totalPages() {
            return Math.ceil(this.paymentData.length / this.perPage) || 1;
        },
        paginatedData() {
            const start = (this.page - 1) * this.perPage;
            return this.paymentData.slice(start, start + this.perPage);
        },
    },
    methods: {
        nextPage() {
            if (this.page < this.totalPages) this.page++;
        },
        prevPage() {
            if (this.page > 1) this.page--;
        },
        generateNumbers() {
            const referenceNumber = Math.floor(1000 + Math.random() * 9000).toString();

            // 1. Filter relevant payments first
            const relevantPayments = (this.payments || []).filter(p =>
                p.academicYearId === this.academicYearId &&
                p.termId === this.termId
            );

            // 2. Extract numeric batch numbers safely
            const maxBatchNumber = relevantPayments.reduce((max, p) => {
                const num = parseInt(p.batchNumber, 10);
                return !isNaN(num) && num > max ? num : max;
            }, 0);

            // 3. Increment or start from 1 (no randomness needed for batches)
            const batchNumber = (maxBatchNumber > 0 ? maxBatchNumber + 1 : Math.floor(1000 + Math.random() * 9000).toString()).toString();

            const batchNumberStr = batchNumber.toString();
            const referenceNumberStr = referenceNumber.toString();

            this.batchNumber = batchNumberStr;
            this.referenceNumber = referenceNumberStr;

            return {
                batchNumber: batchNumberStr,
                referenceNumber: referenceNumberStr
            };
        },
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        getStudentBills() {
            return axios.get('/SmBillingAndPayments/GetStudentBills').then(res => {
                this.studentBills = res.data.filter(b => !b.isCanceled);
            });
        },

        getPayments() {
            return axios.get('/SmBillingAndPayments/GetPayments/').then(res => {
                this.payments = res.data.filter(p => !p.isCanceled && !p.isProcessed && !p.isPosted);
                this.payments.forEach(p => {
                    p.paymentDate = this.formatDate(p.paymentDate);
                });
                this.dataTable(this.paymentData);
            });
        },

        getAcademicYears() {
            return axios.get('/SmMainSetups/ListAllAcademicYears').then(res => {
                this.academicYears = res.data;
                const activeYear = this.academicYears.find(y => y.isActive === true);
                if (activeYear) {
                    this.academicYearId = activeYear.id;
                }
            });
        },

        getTerms() {
            return axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`).then(res => {
                this.terms = res.data;
            });
        },

        getClasses() {
            return axios.get('/SmMainSetups/ListAllLevelClasses/').then(res => {
                this.classes = res.data;
            });
        },

        getMainClasses() {
            return axios.get('/SmMainSetups/ListAllClasses/').then(res => {
                this.mainClasses = res.data;
            });
        },

        getStreams() {
            return axios.get('/SmMainSetups/ListAllStreams/').then(res => {
                this.streams = res.data;
            });
        },

        getLevels() {
            return axios.get('/SmMainSetups/ListAllLevels/').then(res => {
                this.levels = res.data;
            });
        },

        getBanks() {
            return axios.get('/SharedResource/GetBanks').then(res => {
                this.banks = res.data;
            });
        },

        getCurrencies() {
            return axios.get('/SharedResource/GetCurrencys').then(res => {
                this.currencies = res.data;
                const cediNames = ["ghana cedis", "ghana cedi", "cedi"];
                const activeCurrency = this.currencies.find(y =>
                    cediNames.includes(y.currencyName?.trim().toLowerCase())
                );

                if (activeCurrency) {
                    this.currencyId = activeCurrency.id;
                }
            });
        },

        getPaymentMethods() {
            return axios.get(`/jsonDataSample/paymentMethods.json?v=${new Date().getTime()}`).then(res => {
                this.paymentMethods = res.data;
                const defaultPaymentMethod = this.paymentMethods.find(p => p.id === 1);

                if (defaultPaymentMethod) {
                    this.paymentMethod = defaultPaymentMethod.id;
                }
            });
        },

        getPaymentAccounts() {
            return axios.get('/LedgerSetups/GetChartOfAccountDetails').then(res => {
                this.accountsList = res.data.accountDetails;
                this.processAccountsList();
            });
        },

        getDefaultAccounts() {
            return axios.get('/SmBillingAndPayments/GetPaymentAccounts/').then(res => {
                this.defaultAccounts = res.data[0];
                if (this.defaultAccounts) {
                    const defaultBankAccount = this.accountsList.find(
                        a => a.id === this.defaultAccounts.localDebitGlId
                    );

                    if (defaultBankAccount) {
                        this.bankGlId = defaultBankAccount.id;
                    }

                    const defaultArAccount = this.accountsList.find(
                        a => a.id === this.defaultAccounts.localCreditGlId
                    );

                    if (defaultArAccount) {
                        this.debitGlId = defaultArAccount.id;
                    }
                }
            });
        },

        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(res => {
                this.students = res.data;
                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName} `.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
            });
        },

        processAccountsList() {
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
        },
        getBankDetails(id)
        {
            return this.banks.find(a => a.id === id);
        },
        getBankBranchDetails(id)
        {
            return this.bankBranches.find(a => a.id === id);
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getClassName(classId) {
            const cls = this.allLevelClasses.find(c => c.id === classId);
            return cls ? cls.name : '';
        },
        initDropdowns() {
            const levelClassDropdown = this.getLevelClasses();
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.classList = levelClassDropdown;
        },
        getLevelClasses() {
            return this.classes
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
        },
        filterClassesByLevel(levelId) {

            const filtered = this.getLevelClasses(levelId);

            filtered.sort((a, b) => a.name.localeCompare(b.name));

            this.classList = filtered;

            // reset selected class when level changes
            this.classId = null;
        },
      
        filterStudentsByClass() {
            if (!this.classId) {
                this.studentList = [];
                return;
            }

            const billedStudentIds = new Set(
                this.studentBills
                    .filter(b =>
                        b.academicYearId === this.academicYearId &&
                        b.termId === this.termId &&
                        !b.isCanceled
                    )
                    .map(b => b.studentId)
            );

            this.studentList = this.students
                .filter(s =>
                    billedStudentIds.has(s.id) &&
                    s.classId === this.classId
                )
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            if (!this.isEdit) {
                this.studentId = null;
            }
        },
        async savePayment() {
            // --- Validation ---
            if (!this.studentId) {
                this.toastHandler('warning', 'Please select a student.');
                return;
            }
            if (!this.academicYearId) {
                this.toastHandler('warning', 'Please select an academic year.');
                return;
            }
            if (!this.termId) {
                this.toastHandler('warning', 'Please select a term.');
                return;
            }
            if (!this.amountToPaid || parseFloat(this.amountToPaid ) <= 0) {
                this.toastHandler('warning', 'Please enter a valid payment amount.');
                return;
            }
            if (!this.paymentMethod) {
                this.toastHandler('warning', 'Please select a payment method.');
                return;
            }
            if (!this.bankGlId) {
                this.toastHandler('warning', 'Please select a bank GL account.');
                return;
            }
            if (!this.debitGlId) {
                this.toastHandler('warning', 'Please select an AR GL account.');
                return;
            }
            if (!this.currencyId) {
                this.toastHandler('warning', 'Please select a currency.');
                return;
            }

           /* // Cheque field validation when payment method is not cash
            const isBank = this.paymentMethods.find(p =>
                p.id === this.paymentMethod
            )?.name?.toLowerCase() === 'bank transfer';*/

            if (this.paymentMethod === 2) {
                if (!this.bankId) {
                    this.toastHandler('warning', 'Please select a bank.');
                    return;
                }
            }
            const convertedAmount = this.isMultiCurrency
                ? this.amountToPaid * this.buyRate
                : this.amountToPaid;

            this.balance = this.amountDue - convertedAmount;
           
            // --- Payload ---
            const payload = {
                studentId:      this.studentId,
                academicYearId: this.academicYearId,
                termId:         this.termId,
                classId:        this.classId,
                paymentDate:    this.paymentDate,
                amountDue:      this.amountDue,
                amountToPaid:   this.amountToPaid,
                paymentMethod:  this.paymentMethod,
                debitGlId:      this.debitGlId ? this.debitGlId  : this.emptyGuid,
                creditGlId:     this.creditGlId ? this.creditGlId : this.emptyGuid,
                bankGlId:       this.bankGlId ? this.bankGlId : this.emptyGuid,
                currencyId:     this.currencyId,
                buyRate:        this.buyRate,
                isMultiCurrency: this.isMultiCurrency,
                batchNumber:    this.batchNumber,
                receiptNumber:  this.receiptNumber,
                bankId:         this.bankId ? this.bankId : this.emptyGuid,
                bankBranchId:   this.bankBranchId ? this.bankBranchId : this.emptyGuid,
                chequeNumber:   this.chequeNumber,
                chequeDate:     this.chequeDate,
                legalGuardianId: this.legalGuardianId,
                byLegalGuardian: this.byLegalGuardian,
                description:    this.description,
                referenceNumber: this.referenceNumber,
                balance: this.balance,
                
            };
            const amountToPaid = parseFloat(this.amountToPaid) || 0;
            const amountDue = parseFloat(this.amountDue) || 0;

            if (amountToPaid > amountDue) {
                const result = await Swal.fire({
                    title: 'Confirm Payment',
                    text: `Payment amount ${amountToPaid.toFixed(2)} exceeds the amount due ${amountDue.toFixed(2)}. Are you sure you want to save with this payment?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed',
                    cancelButtonText: 'Cancel'
                });

                if (!result.isConfirmed) {
                    return;
                }
            }
            else {
                const result = await Swal.fire({
                    title: 'Confirm Payment',
                    text: `Are you sure you want to save with this payment?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed',
                    cancelButtonText: 'Cancel'
                });

                if (!result.isConfirmed) {
                    return;
                }
            }
            // --- Submit ---
            try {
                if (this.isEdit) {
                    payload.id = this.paymentId;
                    payload.tenantId = this.tenantId;
                    axios.post('/SmBillingAndPayments/UpdatePayment', payload)
                        .then(() => {
                            this.toastHandler('success', 'Updated successfully');
                            this.getPayments();
                           // this.resetForm();
                        })
                        .catch(() => this.toastHandler('error'))
                        .finally(() => { this.isLoading = false; });
                } else{
                    this.isLoading = true;
                    const response = await axios.post('/SmBillingAndPayments/CreatePayment', payload);
                    if (response.data.code === 200) {
                        this.toastHandler('success', 'Payment created successfully.');
                        this.getPayments();
                        const paymentId = response.data.id;
                        const studentId = response.data.studentId;
                        await this.printPayment(paymentId, studentId);
                    } else {
                        this.toastHandler('error', response.data.message || 'Failed to create payment.');
                    }
                }
                    
            } catch (error) {
                this.toastHandler('error', 'An unexpected error occurred while creating the payment.');
            } finally {
                this.isLoading = false;
            }
        },
        async printPayment(paymentId, studentId) {

            this.isLoading = true;
            const result = await Swal.fire({
                title: 'Confirm Print',
                text: 'Do you want to print the payment receipt? ',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'Cancel',
            });

            if (!result.isConfirmed) {
                return;
            }

            $("#reportModal").modal("show");

            const url = `/SmReports/GetPaymentReceipt?paymentId=${paymentId}&studentId=${studentId}`;

            axios.get(url)
                .then(response => {

                    const header = response.data.reportHeader;
                    const details = response.data.reportDetails;

                    this.reportPath = this.reportPathConfig.summaryReportPath;

                    this.renderReport(
                        header,
                        details,
                        this.reportPath
                    );

                })
                .catch(err => {
                    console.error(err);
                    this.toastHandler('error', 'Unable to load receipt.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        getSelectedPayments() {
            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedPayments = [];
            let check = obj.checkSelectedRowsIndexes;
            if (check.length)
            {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }
            this.selectedPayments = rec;
        },

        getRecords(pageInx, inx, proxy, rec)
        {
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
        getLevelId(classId) {
            const classObj = this.classes.find(c => c.id === classId);
            return classObj ? classObj.levelId : null;
        },
        editPayment(p) {
            this.isEdit = true;
            this.paymentId = p.id;
            this.tenantId = p.tenantId;
            this.studentId = p.studentId;
            this.academicYearId = p.academicYearId;
            this.termId = p.termId;
            this.classId = p.classId;
            this.paymentDate = p.paymentDate
                ? new Date(p.paymentDate).toISOString().split('T')[0]
                : null;
            this.amountToPaid = p.amountToPaid;
            this.paymentMethod = p.paymentMethod;
            this.debitGlId = p.debitGlId;
            this.creditGlId = p.creditGlId;
            this.bankGlId = p.bankGlId;
            this.currencyId = p.currencyId;
            this.buyRate = p.buyRate;
            this.isMultiCurrency = p.isMultiCurrency;
            this.batchNumber = p.batchNumber;
            this.receiptNumber = p.receiptNumber;
            this.referenceNumber = p.referenceNumber;
            this.bankId = p.bankId;
            this.bankBranchId = p.bankBranchId;
            this.chequeNumber = p.chequeNumber;
            this.chequeDate = p.chequeDate ? new Date(p.chequeDate).toISOString().split('T')[0] : null;
            this.legalGuardianId = p.legalGuardianId;
            this.byLegalGuardian = p.byLegalGuardian;
            this.description = p.description;
            this.balance = p.balance;
            this.tenantId = p.tenantId;
            

            this.$nextTick(() => {
                document.getElementById('form')
                    ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
            });
        },
        createPayment() {
            this.$nextTick(() => {
                document.getElementById('form')
                    ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
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
                rowSelected: () => {
                    this.getSelectedPayments();
                },

                rowDeselected: () => {
                    this.getSelectedPayments();
                },

                checkBoxChange: () => {
                    this.getSelectedPayments();
                }
            });
        },
        async processPayments() {
            this.getSelectedPayments();

            if (!this.selectedPayments.length) {
                this.toastHandler('warning', 'Please select payments to process.');
                return;
            }

            this.isLoading = true;

            let payload = {
                paymentIds: this.selectedPayments.map(a => a.id)
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
        resetForm() {
            location.reload();
        },
        printReport() {
            this.isLoading = true;
            $("#reportModal").modal("show");
            this.getSelectedPayments();

            if (this.selectedPayments.length === 0) {
                this.toastHandler('warning', 'Please select a payment to print.');
                this.isLoading = false;
                $("#reportModal").modal("hide");
                return;
            }

            const selectedPayment = this.selectedPayments[0];

            const paymentId = selectedPayment.id;
            const studentId = selectedPayment.studentId;

            const url = `/SmReports/GetPaymentReceipt?paymentId=${paymentId}&studentId=${studentId}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;

            axios.get(url)
                .then(response => {
                    const header = response.data.reportHeader;
                    const details = response.data.reportDetails;
                    this.renderReport(header, details, this.reportPath);
                    this.isLoading = false;
                    $("#reportModal").modal("hide");
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                    $("#reportModal").modal("hide");
                })
                .finally(() => {
                    this.isLoading = false;
                });
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
                    this.toastHandler('error', args.message || 'Report rendering failed.');
                }
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
        currencyId(newVal) {

            const cediNames = ["ghana cedis", "ghana cedi", "cedi"];

            const defaultCurrency = this.currencies.find(y =>
                cediNames.includes(y.currencyName?.trim().toLowerCase())
            );

            if (defaultCurrency) {
                this.isMultiCurrency = newVal !== defaultCurrency.id;
            }

            const currency = this.currencies.find(y => y.id === newVal);

            const rate = currency?.buyRate ?? 1;

            this.buyRate = Number(rate).toFixed(4);
        },
        isMultiCurrency(newVal) {
            this.bankGlId = newVal
                ? this.defaultAccounts.foreignDebitGlId
                : this.defaultAccounts.localDebitGlId;

            this.debitGlId = newVal
                ? this.defaultAccounts.otherPaymentCreditGlId
                : this.defaultAccounts.localCreditGlId;
            
           
        },
        classId(newVal) {
            this.filterStudentsByClass();
        },
        studentId(newVal) {
            if (!newVal) return;

            if (this.isEdit) return;

            // find unprocessed payments for this student
            const pendingPayments = this.payments.filter(p =>
                p.studentId === newVal
            );

            if (pendingPayments.length === 0) return;

            const totalPending = pendingPayments.reduce(
                (sum, p) => sum + (parseFloat(p.amountToPaid) || 0),
                0
            );

            Swal.fire({
                title: 'Confirm Payment',
                html: `
                <div style="text-align:center">
                    <p>This student already has an unprocessed payment.</p>
                    <p><strong>Pending Amount:</strong> ${totalPending.toFixed(2)}</p>
                    <hr/>
                    <p>Do you want to continue creating a new payment?</p>
                </div>
            `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Continue',
                cancelButtonText: 'Cancel'
            }).then(result => {
                if (!result.isConfirmed) {
                    this.resetForm();
                }
            });
        },
        paymentData(newData) {
            if ($("#dataTable").data("ejGrid")) {
                $("#dataTable").ejGrid("destroy");
            }
            this.dataTable(newData);
        }
    },
    async mounted() {
        this.isLoading = true;
        this.reportApiBaseUrl = reportApiBaseUrl;
        try {
            // Needed for the form
            await Promise.all([
                this.getAcademicYears(),
                this.getTerms(),
                this.getMainClasses(),
                this.getStreams(),
                this.getClasses(),
                this.getLevels(),
                this.getStudents(),
                this.getCurrencies(),
                this.getPaymentMethods(),
                this.getPaymentAccounts(),
                this.getDefaultAccounts(),
            ]);
            this.initDropdowns();
            this.generateNumbers();
            this.getStudentBills();
            this.getPayments();
            this.getBanks();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            this.isLoading = false;
        }
    }
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');