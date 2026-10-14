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
            banks:'',
            bankId:'',
            bankBranchId: '',
            chequeNumber: '',
            chequeDate: new Date().toISOString().substr(0, 10),
            description: 'Payment',
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
            memos: [],
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
            isLoading: false,
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

            // Class-wide credit memo
            if (this.byClass) {

                if (!this.classId) return 0;

                return this.students
                    .filter(s => s.classId === this.classId)
                    .reduce((sum, s) => {
                        return sum + (parseFloat(s.balanceDue) || 0);
                    }, 0);
            }

            // Single student credit memo
            if (!this.studentId) return 0;

            const student = this.students.find(s => s.id === this.studentId);

            return parseFloat(student?.balanceDue) || 0;
        },
        paymentData() {
            const data = this.memos.map(p => {

                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const debitAccount = this.accountsList.find(a => a.id === p.debitGlId);
                const creditAccount = this.accountsList.find(a => a.id === p.creditGlId);
                const paymentMethod = this.paymentMethods.find(m => m.id === p.paymentMethod);

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
                    amountDue,
                    amountToCredit,
                    buyRate,
                    convertedAmount,
                    isPosted: p.isPosted,
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
                return data;
                
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
        loadData() {
            return axios.all([
                axios.get('/SmBillingAndPayments/GetStudentBills'),
                axios.get('/SmBillingAndPayments/GetMemos/'),
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
                axios.get('/SmBillingAndPayments/GetCreditMemoAccounts/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
            ]).then(axios.spread((bills, memos, years, term, classes, mainClasses, streams, levels, banks, currencies,paymentMethods, accounts, defaultAccounts, students ) => {

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
                this.studentBills = bills.data;
                this.memos = memos.data.filter(p => !p.isCanceled );
                this.memos.forEach(p => {
                    p.date = this.formatDate(p.date);
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
                    {field: "isPosted", headerText: "Posted?", width: 50},
                    {field: "studentName", headerText: "Student", textAlign: ej.TextAlign.Left, width: 140},
                    {field: "paymentDate", headerText: "Date", width: 80, format: "{0:yyyy-MM-dd}"},
                    {field: "batchNumber", headerText: "Batch #", width: 80},
                    {field: "amountDue", headerText: "Amount Due", width: 80, format: "{0:n2}"},
                    {field: "amountToCredit", headerText: "Credit Amount", width: 80, format: "{0:n2}"},
                    {field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 80},
                    {field: "buyRate", headerText: "Rate", width: 40, format: "{0:n4}"},
                    {field: "convertedAmount", headerText: "FX Amount", width: 80, format: "{0:n2}"},
                    {field: "newBalanceDisplay", headerText: "Balance", width: 80, format: "{0:n2}"},
                    {field: "tenantId", visible: false, headerText: "Tenant Id", width: 15}
                ],
            });
        },
        getPayments() {
            this.isLoading = true;
            axios.get('/SmBillingAndPayments/GetMemos')
                .then(response => {
                    this.memos = response.data.filter(p => !p.isCanceled && !p.isProcessed && !p.isPosted )
                    this.dataTable(this.paymentData);
                    this.isLoading = false;
                })
                .catch(error => {
                    this.toastHandler('error', 'Failed to fetch payments.');
                })
        },
        async cancelPayments() {
            this.getSelectedPayments();

            if (!this.selectedPayments.length) {
                this.toastHandler('warning', 'Please select a payment to cancel.');
                return;
            }

            this.isLoading = true;

            let payload = {
                paymentIds: this.selectedPayments.map(a => a.id)
            };
            const result = await Swal.fire({
                title: 'Confirm Cancellation',
                text: `Are you sure you want to cancel selected credit memos?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d'
            });

            if (!result.isConfirmed) {
                return;
            }
            axios.post('/SmBillingAndPayments/CancelMemos', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', response.data.message);
                        this.getPayments();
                    } else {
                        this.toastHandler('warning', response.data.message);
                    }
                    this.isLoading = false;
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
        paymentData(newData) {
            if ($("#dataTable").data("ejGrid")) {
                $("#dataTable").ejGrid("destroy");
            }
            this.dataTable(newData);
        }
    },
    mounted() {
            this.loadData();
    },
});
app.component('shimmer-loader', ShimmerLoader);
app.mount('#app');