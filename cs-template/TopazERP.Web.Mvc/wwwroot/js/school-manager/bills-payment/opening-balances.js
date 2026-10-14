const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            levels: [],
            academicYearId: '',
            classId: '',
            levelId:'',
            amount: 0.00,
            currencies: [],
            currencyId: '',
            rate: 0,
            date: new Date().toISOString().substr(0, 10),
            activeTab: 'create',
            foundExisting: false,
            studentId: '',
            tenantId: null,
            balanceId : null,
            isEdit: false,
            page: 1,
            perPage: 10,
            searchText: '',
            isShimmerLoading: false,
            studentList: [],
            classList: [],
            isLoading: false,
            openingBalances:[],
            isMultiCurrency: false,
            IsPosted: false,
            selectedBalances: [],
        }
    },
    computed: {
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
        },
        isAllSelected() {
            return this.balanceData.length > 0 &&
                this.balanceData.every(b =>
                    this.selectedBalances.includes(b.id)
                );
        },
        balanceData() {
            const data = this.openingBalances.map(p => {
                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const academicYear = this.academicYears.find(c => c.academicYearId === p.currencyId);
                const amount = parseFloat(p.amount) || 0;
                const rate = parseFloat(p.rate) || 1;
                const convertedAmount =  amount * rate;
                const className = this.getClassName(p.classId);

                return {
                    id: p.id,
                    tenantId: p.tenantId,
                    studentId: p.studentId,
                    academicYearId: p.academicYearId,
                    classId: p.classId,
                    currencyId: p.currencyId,
                    date: p.date,
                    amount,
                    rate,
                    convertedAmount,
                    studentName: student ? student.name : '—',
                    studentIdentifier: student ? student.studentIdentifier : '',
                    currencyName: currency ? currency.currencyName : '—',
                    academicYearName: academicYear ? academicYear.name: '—',
                    className,
                    isPosted: p.isPosted,
                };
            });

            if (!this.searchText) {
                return data;
            }

            const search = this.searchText.toLowerCase().trim();

            return data.filter(p =>
                (p.studentName || '').toLowerCase().includes(search) ||
                (p.currencyName || '').toLowerCase().includes(search) ||
                (p.amount || '').toString().includes(search) ||
                (p.rate || '').toString().includes(search) ||
                (p.convertedAmount || '').toString().includes(search) ||
                (p.academicYearName || '').toLowerCase().includes(search) ||
                (p.studentIdentifier || '').toLowerCase().includes(search)
            );
        },
        totalPages() {
            return Math.ceil(this.balanceData.length / this.perPage) || 1;
        },
        paginatedData() {
            const start = (this.page - 1) * this.perPage;
            return this.balanceData.slice(start, start + this.perPage);
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
        toggleSelectAll() {
            if (this.isAllSelected) {
                // Remove current page records from selection
                this.selectedBalances = this.selectedBalances.filter(
                    id => !this.balanceData.some(b => b.id === id)
                );
            } else {
                // Add current page records
                const ids = this.balanceData.map(b => b.id);

                this.selectedBalances = [
                    ...new Set([
                        ...this.selectedBalances,
                        ...ids
                    ])
                ];
            }
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        getBalances() {
            return axios.get('/SmBillingAndPayments/GetBalances').then(res => {
                this.openingBalances = res.data.result;
                this.openingBalances.forEach(p => {
                    p.date = this.formatDate(p.date);
                });
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
        
        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(res => {
                this.students = res.data;
                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName} `.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
            });
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
        hasExistingBalance() {
            return this.openingBalances.some(balance => {
                // Ignore the current record when editing
                if (this.isEdit && balance.id === this.balanceId) {
                    return false;
                }

                return (
                    balance.studentId === this.studentId &&
                    balance.academicYearId === this.academicYearId &&
                    balance.currencyId === this.currencyId
                );
            });
        },
        async saveBalance() {
            // --- Validation ---
            if (!this.studentId) {
                this.toastHandler('warning', 'Please select a student.');
                return;
            }
            if (!this.academicYearId) {
                this.toastHandler('warning', 'Please select an academic year.');
                return;
            }
           
            if (!this.amount || parseFloat(this.amount ) <= 0) {
                this.toastHandler('warning', 'Please enter a valid amount.');
                return;
            }

            if (!this.currencyId) {
                this.toastHandler('warning', 'Please select a currency.');
                return;
            }

            // Check for duplicate balance
            if (this.hasExistingBalance()) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Duplicate Balance',
                    text: 'A student cannot have more than one opening balance for the same currency in the selected academic year.',
                    confirmButtonText: 'OK'
                });

                return;
            }
            const result = await Swal.fire({
                title: 'Confirm',
                text: 'Are you sure you want to save with this balance?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Proceed',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return;
            }
            
            // --- Payload ---
            const payload = {
                studentId:      this.studentId,
                academicYearId: this.academicYearId,
                classId:        this.classId,
                date:           this.date,
                amount:         this.amount,
                currencyId:     this.currencyId,
                rate:           this.rate,

            };
            
            
            // --- Submit ---
            try {
                if (this.isEdit) {
                    payload.id = this.balanceId;
                    payload.tenantId = this.tenantId;
                    axios.post('/SmBillingAndPayments/UpdateBalance', payload)
                        .then(() => {
                            this.toastHandler('success', 'Updated successfully');
                            this.getBalances();
                            // this.resetForm();
                        })
                        .catch(() => this.toastHandler('error'))
                        .finally(() => { this.isLoading = false; });
                } else{
                    this.isLoading = true;
                    const response = await axios.post('/SmBillingAndPayments/CreateBalance', payload);
                    if (response.data.code === 200) {
                        this.toastHandler('success', 'Balance created successfully.');
                        this.getBalances();
                    } else {
                        this.toastHandler('error', response.data.message || 'Failed to create balance.');
                    }
                }

            } catch (error) {
                this.toastHandler('error', 'An unexpected error occurred while creating the payment.');
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
        editBalance(p) {
            this.isEdit = true;
            this.balanceId = p.id;
            this.tenantId = p.tenantId;
            this.studentId = p.studentId;
            this.academicYearId = p.academicYearId;
            this.classId = p.classId;
            this.date = p.date
                ? new Date(p.date).toISOString().split('T')[0]
                : null;
            this.amount = p.amount;
            this.currencyId = p.currencyId;
            this.rate = p.rate;
           


            this.$nextTick(() => {
                document.getElementById('form')
                    ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
            });
        },
        createBalance() {
            this.$nextTick(() => {
                document.getElementById('form')
                    ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
            });
        },
        async deleteSelectedBalances() {

            if (!this.selectedBalances.length) {
                return;
            }

            const count = this.selectedBalances.length;
            let payload = {
                balanceIds: this.selectedBalances
            };
            const result = await Swal.fire({
                title: 'Confirm Delete',
                text: `Are you sure you want to delete ${count} selected balance${count > 1 ? 's' : ''}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Delete',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d'
            });

            if (!result.isConfirmed) {
                this.isLoading = false;
                return;
            }

            this.isLoading = true;

            try {

                await axios.post('/SmBillingAndPayments/DeleteBalances', payload);

                this.toastHandler(
                    'success',
                    `${count} balance${count > 1 ? 's' : ''} deleted successfully.`
                );

                this.selectedBalances = [];

                await this.getBalances();

            } catch (err) {

                console.error(err);

                this.toastHandler(
                    'error',
                    'Failed to delete selected balances.'
                );

            } finally {

                this.isLoading = false;

            }
        },
        async deleteBalance(id) {
            this.isLoading = true;
            const result = await Swal.fire({
                title: 'Confirm Delete',
                text: `Are you sure you want to delete this balance?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d'
            });

            if (!result.isConfirmed) {
                this.isLoading = false;
                return;
            }
            axios.delete(`/SmBillingAndPayments/DeleteBalance?id=${id}`)
                .then(response => {
                    this.toastHandler('success', 'Balance deleted successfully.');
                    this.getBalances();
                }).catch(err => {
                    this.toastHandler('error', 'Failed to delete balance.');
                    this.isLoading = false;
                });
        },
        filterStudentsByClass() {
            if (!this.classId) {
                this.studentList = [];
                return;
            }
            
            this.studentList = this.students
                .filter(s =>
                    s.classId === this.classId
                )
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            if (!this.isEdit) {
                this.studentId = null;
            }
        },
        resetForm() {
           
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
        classId(newVal) {
            this.filterStudentsByClass();
        }
    },
    async mounted() {
        this.isLoading = true;
        try {
            // Needed for the form
            await Promise.all([
                this.getAcademicYears(),
                this.getMainClasses(),
                this.getStreams(),
                this.getClasses(),
                this.getLevels(),
                this.getStudents(),
                this.getCurrencies(),
            ]);
            this.initDropdowns();
            this.getBalances();
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