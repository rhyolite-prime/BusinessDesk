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
            bills:[],
            payments: [],
            memos: [],
            students: [],
            accountsList: [],
            defaultAccounts: {},
            studentId: null,
            paymentId: null,
            currencies:[],
            levelId: '',
            activeTab: 'payments',
            isShimmerLoading: false,

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
            return this.payments.map(p => {

                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const debitAccount = this.accountsList.find(a => a.id === p.debitGlId);
                const creditAccount = this.accountsList.find(a => a.id === p.creditGlId);

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
                    isPosted: p.isPosted,
                    isProcessed: p.isProcessed,
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
                };
            });
        },
        memoData() {
            return this.memos.map(p => {

                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const debitAccount = this.accountsList.find(a => a.id === p.debitGlId);
                const creditAccount = this.accountsList.find(a => a.id === p.creditGlId);

                const amountToCredit = parseFloat(p.amountToCredit) || 0;
                const buyRate = parseFloat(p.rate) || 1;
                const amountDue = parseFloat(p.amountDue) || 0;

                const convertedAmount = p.isMultiCurrency
                    ? amountToCredit * buyRate
                    : amountToCredit;

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
                    paymentDate: p.date,
                    batchNumber: p.batchNumber || '—',
                    receiptNumber: p.receiptNumber || '—',
                    referenceNumber: p.referenceNumber,
                    description: p.description,
                    isPosted: p.isPosted,
                    amountDue,
                    amountToCredit,
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
                };
            });
        },
     

    },
    methods: {
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");
        },
        loadData() {
            return axios.all([
                axios.get('/SmBillingAndPayments/GetPayments/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/LedgerSetups/GetChartOfAccountDetails'),
                axios.get('/SmBillingAndPayments/GetPaymentAccounts/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmBillingAndPayments/GetMemos/'),
                axios.get('/SharedResource/GetCurrencys'),
            ]).then(axios.spread(( payments, years, term, classes, mainClasses, streams, levels,  accounts, defaultAccounts, students, memos,  currencies ) => {

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
                this.payments = payments.data.filter(p => !p.isCanceled);
                this.accountsList = accounts.data.accountDetails;
                this.defaultAccounts = defaultAccounts.data[0];
                this.memos = memos.data.filter(m => !m.isCanceled)
                this.memos.forEach(p => {
                    p.date = this.formatDate(p.date);
                });
                this.payments.forEach(p => {
                    p.paymentDate = this.formatDate(p.paymentDate);
                });
                this.currencies = currencies.data;
                this.initDropdowns();
                this.paymentDataTable(this.paymentData);
                this.memoDataTable(this.memoData);
               
            }));
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
            const activeYear = this.academicYears.find(y => y.isActive === true);
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }
            const firstTerm = this.terms[0]
            if (firstTerm) {
                this.termId = firstTerm.id;
            }
            
        },
        filterPayments(academicYearId, termId) {
            const filtered = this.paymentData.filter(p => p.academicYearId === academicYearId && p.termId === termId);
            this.paymentDataTable(filtered);
        },
        filterMemos(academicYearId, termId) {
            const filtered = this.memoData.filter(m => m.academicYearId === academicYearId && m.termId === termId);
            this.memoDataTable(filtered);
        },
        getLevelClasses(levelId) {
            if (!levelId) {
                return this.classes.map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
            }

            return this.classes
                .filter(c => c.levelId === levelId)
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
        },
    
        getLevelId(classId) {
            const classObj = this.classes.find(c => c.id === classId);
            return classObj ? classObj.levelId : null;
        },
        paymentDataTable(paymentData) {
            $("#paymentDataTable").ejGrid({
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
                    {field: "isPosted", headerText: "Posted?", width: 60},
                    {field: "isProcessed", headerText: "Processed?", width: 60},
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
        memoDataTable(memoData) {
            $("#memoDataTable").ejGrid({
                dataSource: memoData,
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
                    {field: "isPosted", headerText: "Posted", width: 60},
                    {field: "studentName", headerText: "Student", textAlign: ej.TextAlign.Left, width: 140},
                    {field: "paymentDate", headerText: "Date", width: 80, format: "{0:yyyy-MM-dd}"},
                    {field: "batchNumber", headerText: "Batch #", width: 80},
                    {field: "amountDue", headerText: "Amt Due", width: 80, format: "{0:n2}"},
                    {field: "amountToCredit", headerText: "Amount", width: 80, format: "{0:n2}"},
                    {field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 80},
                    {field: "buyRate", headerText: "Rate", width: 40, format: "{0:n4}"},
                    {field: "convertedAmount", headerText: "FX Amt", width: 80, format: "{0:n2}"},
                    {field: "newBalanceDisplay", headerText: "Balance", width: 80, format: "{0:n2}"},
                    {field: "tenantId", visible: false, headerText: "Tenant Id", width: 15}
                ],
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
        resetTables() {
            this.paymentDataTable(this.paymentData);
            this.memoDataTable(this.memoData);
            this.billDataTable(this.billData);
        }
    },
      watch: {
         academicYearId(newVal, oldVal) {
             if (this.activeTab === 'payments') {
                 this.filterPayments(this.academicYearId, this.termId);
             }
             else if (this.activeTab === 'memos') {
                 this.filterMemos(this.academicYearId, this.termId);
             }
         },
          termId(newVal, oldVal) {
              if (this.activeTab === 'payments') {
                  this.filterPayments(this.academicYearId, this.termId);
              }
              else if (this.activeTab === 'memos') {
                  this.filterMemos(this.academicYearId, this.termId);
              }
          }
      },
    async mounted() {
        await this.loadData();
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');