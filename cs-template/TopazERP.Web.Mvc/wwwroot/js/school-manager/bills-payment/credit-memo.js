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
            amountToCredit: 0.00,
            currencies: [],
            currencyId: '',
            rate: 0,
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
            description: 'Credit Memo',
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
            memoId : null,
            amountDueValue: 0,
            isEdit: false,
            page: 1,
            perPage: 10,
            searchText: '',
            byClass: false,
            lastBatchCounter: '',
            lastReceiptCounter: '',
            isShimmerLoading: false,
            classList:[],
            students:[],
            studentList:[],
            
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
                    chequeNumber: p.chequeNumber,
                    chequeDate: p.chequeDate,
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
                (p.batchNumber || '').toLowerCase().includes(search) ||
                (p.paymentMethodName || '').toLowerCase().includes(search) ||
                (p.currencyName || '').toLowerCase().includes(search) ||
                (p.debitAccountName || '').toLowerCase().includes(search) ||
                (p.creditAccountName || '').toLowerCase().includes(search) ||
                (p.description || '').toLowerCase().includes(search) ||
                (p.amountDue || '').toString().includes(search) ||
                (p.amountToCredit || '').toString().includes(search) ||
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
                this.studentBills = res.data;
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
            return axios.get('/SmBillingAndPayments/GetCreditMemoAccounts/').then(res => {
                this.defaultAccounts = res.data[0];
                if (this.defaultAccounts) {
                    const defaultDebitAccount = this.accountsList.find(
                        a => a.id === this.defaultAccounts.debitGlId
                    );

                    if (defaultDebitAccount) {
                        this.debitGlId = defaultDebitAccount.id;
                    }

                    const defaultCreditAccount = this.accountsList.find(
                        a => a.id === this.defaultAccounts.creditGlId
                    );

                    if (defaultCreditAccount) {
                        this.creditGlId = defaultCreditAccount.id;
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
        generateNumbers() {
            
            const relevantPayments = (this.memos || []).filter(p =>
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

            this.batchNumber = batchNumberStr;

            return {
                batchNumber: batchNumberStr,
            };
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
                return this.classes.map(c => ({
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

            // rebind dropdown
            $('#classId').ejDropDownList({
                dataSource: this.classList,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" }
            });
        },
        filterStudentsByClass() {
            if (!this.classId) {
                this.studentList = [];
                return;
            }
            this.studentList = this.students
                .filter(s => s.classId === this.classId)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // only reset if user changed class manually
            if (!this.isEdit) {
                this.studentId = null;
            }
        },
        async saveMemo() {

            // -------------------------
            // VALIDATION
            // -------------------------
            if (!this.byClass && !this.studentId) {
                this.toastHandler('warning', 'Please select a student.');
                return;
            }

            if (!this.byClass && !this.classId) {
                this.toastHandler('warning', 'Please select a class.');
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

            if (!this.amountToCredit || parseFloat(this.amountToCredit) <= 0) {
                this.toastHandler('warning', 'Please enter a valid amount.');
                return;
            }

            if (!this.paymentMethod) {
                this.toastHandler('warning', 'Please select a payment method.');
                return;
            }

            if (!this.debitGlId) {
                this.toastHandler('warning', 'Please select a bank GL account.');
                return;
            }

            if (!this.creditGlId) {
                this.toastHandler('warning', 'Please select an AR GL account.');
                return;
            }

            if (!this.currencyId) {
                this.toastHandler('warning', 'Please select a currency.');
                return;
            }

            // -------------------------
            // CHEQUE VALIDATION
            // -------------------------
            const isCash = this.paymentMethods.find(p =>
                p.id === this.paymentMethod
            )?.name?.toLowerCase() === 'cash';

            if (!isCash) {
                if (!this.bankId) {
                    this.toastHandler('warning', 'Please select a bank.');
                    return;
                }
                if (!this.bankBranchId) {
                    this.toastHandler('warning', 'Please select a bank branch.');
                    return;
                }
                if (!this.chequeNumber) {
                    this.toastHandler('warning', 'Please enter a cheque number.');
                    return;
                }
                if (!this.chequeDate) {
                    this.toastHandler('warning', 'Please enter a cheque date.');
                    return;
                }
            }

            // -------------------------
            // CONFIRMATION
            // -------------------------
            const result = await Swal.fire({
                title: 'Confirm Credit Memo',
                text: 'Are you sure you want to save this credit memo?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Proceed',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return;
            
            let payload;

            if (this.byClass) {
                const classStudents = this.students.filter(s => s.classId === this.classId);
                payload = classStudents.map(s => {

                    return {
                        studentId: s.id,
                        academicYearId: this.academicYearId,
                        termId:         this.termId,
                        classId:        this.classId,
                        date:           this.paymentDate,
                        amountDue:      this.amountDue,
                        amountToCredit: this.amountToCredit,
                        paymentMethod:  this.paymentMethod,
                        debitGlId:      this.debitGlId ? this.debitGlId  : this.emptyGuid,
                        creditGlId:     this.creditGlId ? this.creditGlId : this.emptyGuid,
                        bankGlId:       this.bankGlId ? this.bankGlId : this.emptyGuid,
                        currencyId:     this.currencyId,
                        rate:           this.rate,
                        isMultiCurrency: this.isMultiCurrency,
                        batchNumber:    this.batchNumber,
                        receiptNumber:  this.receiptNumber,
                        bankId:         this.bankId ? this.bankId : this.emptyGuid,
                        bankBranchId:   this.bankBranchId ? this.bankBranchId : this.emptyGuid,
                        chequeNumber:   this.chequeNumber,
                        chequeDate:     this.chequeDate,
                        description:    this.description,
                    };
                });

            } else {

                const obj = {
                    studentId:  this.studentId,
                    academicYearId: this.academicYearId,
                    termId:         this.termId,
                    classId:        this.classId,
                    date:           this.paymentDate,
                    amountDue:      this.amountDue,
                    amountToCredit: this.amountToCredit,
                    paymentMethod:  this.paymentMethod,
                    debitGlId:      this.debitGlId ? this.debitGlId  : this.emptyGuid,
                    creditGlId:     this.creditGlId ? this.creditGlId : this.emptyGuid,
                    bankGlId:       this.bankGlId ? this.bankGlId : this.emptyGuid,
                    currencyId:     this.currencyId,
                    rate:           this.rate,
                    isMultiCurrency: this.isMultiCurrency,
                    batchNumber:    this.batchNumber,
                    receiptNumber:  this.receiptNumber,
                    bankId:         this.bankId ? this.bankId : this.emptyGuid,
                    bankBranchId:   this.bankBranchId ? this.bankBranchId : this.emptyGuid,
                    chequeNumber:   this.chequeNumber,
                    chequeDate:     this.chequeDate,
                    description:    this.description,
                };

                if (this.isEdit) {
                    obj.id = this.memoId;
                    obj.tenantId = this.tenantId;
                }

                payload = obj;
            }
            
            const url = this.byClass
                ? '/SmBillingAndPayments/CreateClassMemo'
                : (this.isEdit
                    ? '/SmBillingAndPayments/UpdateMemo'
                    : '/SmBillingAndPayments/CreateMemo');

            
            try {
                this.isLoading = true;

                let response = await axios.post(url, payload);
                const successCode = 200;
                if (response.data.code === successCode || response.data === 200) {
                    this.toastHandler(
                        'success',
                        this.byClass
                            ? 'Class Credit Memo saved successfully.'
                            : 'Credit Memo saved successfully.'
                    );

                    this.getPayments();
                    this.resetForm();
                } else {
                    this.toastHandler(
                        'error',
                        response.data.message || 'Failed to save credit memo.'
                    );
                }

            } catch (error) {
                this.toastHandler('error', 'An unexpected error occurred.');
            } finally {
                this.isLoading = false;
            }
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
        editMemo(p) {
            this.isEdit = true;
            this.memoId = p.id;
            this.tenantId = p.tenantId;
            this.studentId = p.studentId;
            this.academicYearId = p.academicYearId;
            this.termId = p.termId;
            this.classId = p.classId;
            this.paymentDate = p.paymentDate
                ? new Date(p.paymentDate).toISOString().split('T')[0]
                : null;
            this.amountToCredit = p.amountToCredit;
            this.paymentMethod = p.paymentMethod;
            this.debitGlId = p.debitGlId;
            this.creditGlId = p.creditGlId;
            this.bankGlId = p.bankGlId;
            this.currencyId = p.currencyId;
            this.rate = p.buyRate;
            this.isMultiCurrency = p.isMultiCurrency;
            this.batchNumber = p.batchNumber;
            this.receiptNumber = p.receiptNumber;
            this.referenceNumber = p.referenceNumber;
            this.bankId = p.bankId;
            this.bankBranchId = p.bankBranchId;
            this.chequeNumber = p.chequeNumber;
            this.chequeDate = p.chequeDate ? new Date(p.chequeDate).toISOString().split('T')[0]
                : null;
            this.description = p.description;
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
        getPayments() {
            this.isLoading = true;
            axios.get('/SmBillingAndPayments/GetMemos')
                .then(response => {
                    this.memos = response.data.filter(p => !p.isCanceled)
                    this.isLoading = false;
                })
                .catch(error => {
                    this.toastHandler('error', 'Failed to fetch payments.');
                })
        },
        resetForm() {
           /* this.paymentId = null;
            this.studentId = null;
            this.academicYearId = null;
            this.termId = null;
            this.classId = null;
            this.paymentDate = new Date().toISOString().substr(0, 10);
            this.amountToCredit = 0;
            this.paymentMethod = 1;
            this.debitGlId = null;
            this.creditGlId = null;
            this.bankGlId = null;
            this.currencyId = null;
            this.rate = 1;
            this.isMultiCurrency = false;
            this.referenceNumber = '';
            this.batchNumber = '';
            this.receiptNumber = '';
            this.description = '';
            this.legalGuardianId = null;
            this.byLegalGuardian = false;
            this.bankId = null;
            this.bankBranchId = null;
            this.chequeNumber = '';
            this.chequeDate = '';
            this.byClass = false;

            // Reset EJ dropdowns
            const dropdowns = ['#studentId', '#classId', '#levelId', '#bankId', '#bankBranchId'];
            dropdowns.forEach(id => {
                if ($(id).data('ejDropDownList')) {
                    $(id).ejDropDownList('clearText');
                }
            });*/
            location.reload();
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
        classId(newVal) {
            this.filterStudentsByClass();
        },
        bankId(val) {
            if (val) {
                const bankInfo = this.getBankDetails(val);

                if (bankInfo) {
                    this.bankBranches = [...bankInfo.bankBranches].sort((a, b) => {
                        const nameA = a?.name || "";
                        const nameB = b?.name || "";
                        return nameA.localeCompare(nameB);
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

            this.rate = Number(rate).toFixed(4);
        },
    },
    async mounted() {
        this.isLoading = true;

        try {
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