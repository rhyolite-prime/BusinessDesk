const app = Vue.createApp({
    data() {
        return {
            processedBills: [],
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            levels: [],
            academicYearId: '',
            termId: '',
            classId: '',
            levelId: '',
            selectedBills: [],
            isCancelling: false,
            searchText: '',
            sortKey: '',
            sortAsc: true,
            billTypes:[],
            billingScopes:[],
            schoolBills: [],
            levelBills: [],
            classBills: [],
            cancelBy: 'By Student',
            cancelByOptions: [
                { id: 1, name: 'By Class' },
               /* { id: 2, name: 'By Level' },
                { id: 3, name: 'By Entire School' },*/
                { id: 4, name: 'By Student' },
            ],
            selectedBillIds: [],
            selectedBillStudents: [],
            billId: null,
            students:[],
            studentBillInfo:[],
            page: 1,
            perPage: 10,
            isShimmerLoading: true,
            cancelBillForStudentInput: {
                studentBillInfoIds: [],
            }
        }
    },
    computed: {
        activeStudentBillSet() {
            return new Set(
                (this.studentBillInfo || [])
                    .filter(x => x.billStatusId === 1)
                    .map(x => x.id)
            );
        },
        selectedBillSource() {
            switch (this.cancelBy) {
                case 'By Class':
                    return this.classBills;

                case 'By Level':
                    return this.levelBills;

                case 'By Entire School':
                    return this.schoolBills;
                case 'By Student':
                    return this.processedBills;

                default:
                    return this.processedBills;
            }
        },
        billStudents() {
            const bill = this.processedBills.find(x => x.id === this.billId);
            return (bill?.students || []).filter(
                s => s.toBeBilled && this.activeStudentBillSet.has(s.id)
            );
        },

        allSelected() {
            return this.processedBills.length > 0
                && this.selectedBills.length === this.processedBills.length;
        },
        someSelected() {
            return this.selectedBills.length > 0
                && this.selectedBills.length < this.processedBills.length;
        },
        filteredProcessedBills() {
            let bills = [...this.selectedBillSource];

            // SEARCH
            if (this.searchText) {
                const search = this.searchText.toLowerCase().trim();

                bills = bills.filter(bill => {
                    return (
                        (bill.billNumber && bill.billNumber.toLowerCase().includes(search)) ||
                        (bill.batchNumber && bill.batchNumber.toString().toLowerCase().includes(search)) ||
                        (this.getAcademicYearName(bill.academicYearId) || '').toLowerCase().includes(search) ||
                        (this.getTermName(bill.termId) || '').toLowerCase().includes(search) ||
                        (this.formatDate(bill.billDate) || '').toLowerCase().includes(search) ||
                        (this.getBillTypeName(bill.billTypeId) || '').toLowerCase().includes(search) ||
                        (this.getClassName(bill.classId) || '').toLowerCase().includes(search)
                    );
                });
            }

            // SORT
            if (this.sortKey) {
                const key = this.sortKey;
                const asc = this.sortAsc ? 1 : -1;

                bills.sort((a, b) => {
                    let valA = a[key];
                    let valB = b[key];

                    if (key === 'academicYearId') {
                        valA = this.getAcademicYearName(a.academicYearId);
                        valB = this.getAcademicYearName(b.academicYearId);
                    }

                    if (key === 'termId') {
                        valA = this.getTermName(a.termId);
                        valB = this.getTermName(b.termId);
                    }

                    if (key === 'billDate') {
                        valA = new Date(a.billDate);
                        valB = new Date(b.billDate);
                    }

                    return valA > valB ? asc : valA < valB ? -asc : 0;
                });
            }

            return bills;
        },
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`
            }));
        },
        studentMap() {
            const map = Object.create(null);

            for (const s of this.students) {
                map[s.id] = s;
            }

            return map;
        },
        classMap() {
            const map = Object.create(null);

            for (const c of this.allLevelClasses) {
                map[c.id] = c.name;
            }

            return map;
        },
        billStudentRows() {
            const bill = this.processedBills.find(x => x.id === this.billId);
            const students = (bill?.students || []).filter(s => s.toBeBilled === true);

            const studentMap = this.studentMap;
            const classMap = this.classMap;

            return students
                .filter(s => this.activeStudentBillSet.has(s.id))
                .map(s => {
                    const student = studentMap[s.studentId];
                    return {
                        id: s.id,
                        studentId: s.studentId,

                        name: student
                            ? `${student.firstName || ''} ${student.otherName || ''} ${student.lastName || ''}`.trim()
                            : '',

                        studentIdentifier: student?.studentIdentifier || '',

                        className: student?.classId
                            ? classMap[student.classId] || ''
                            : '',

                        amount: s.amount || 0,
                        discountAmount: s.discountAmount || 0,
                        toBeBilled: s.toBeBilled,
                        billNumber: bill?.billNumber || '',
                        isPosted: bill.isPosted,
                    };
                });
        },
        filteredBillStudentRows() {
            let rows = [...this.billStudentRows];
            if (this.searchText) {
                const search = this.searchText.toLowerCase().trim();

                rows = rows.filter(r => {
                    return (
                        (r.name && r.name.toLowerCase().includes(search)) ||
                        (r.studentIdentifier && r.studentIdentifier.toLowerCase().includes(search)) ||
                        (r.className && r.className.toLowerCase().includes(search)) ||
                        (r.studentId && r.studentId.toLowerCase().includes(search)) ||
                        (r.amount && r.amount.toString().includes(search)) ||
                        (r.discountAmount && r.discountAmount.toString().includes(search))
                    );
                });
            }

            // =====================
            // SORT
            // =====================
            if (this.sortKey) {
                const key = this.sortKey;
                const asc = this.sortAsc ? 1 : -1;

                rows.sort((a, b) => {
                    let valA = a[key];
                    let valB = b[key];

                    // numeric safe sort
                    if (key === 'amount' || key === 'discountAmount') {
                        valA = Number(valA) || 0;
                        valB = Number(valB) || 0;
                    }

                    return valA > valB ? asc : valA < valB ? -asc : 0;
                });
            }

            return rows;
        },
        selectedCancelCount() {
            return this.cancelBy === 'By Student'
                ? this.selectedBillIds.length
                : this.selectedBills.length;
        },
        filteredData(){
            return this.cancelBy === 'By Student'
                ? this.filteredBillStudentRows
                : this.filteredProcessedBills;
        },
        totalPages() {
            return Math.ceil(this.filteredData.length / this.perPage) || 1;
        },

        paginatedData() {
            const start = (this.page - 1) * this.perPage;
            return this.filteredData.slice(start, start + this.perPage);
        }
    },
    methods: {
        nextPage() {
            if (this.page < this.totalPages) this.page++;
        },

        prevPage() {
            if (this.page > 1) this.page--;
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        sort(key) {
            if (this.sortKey === key) {
                this.sortAsc = !this.sortAsc;
            } else {
                this.sortKey = key;
                this.sortAsc = true;
            }
        },
        toggleSelectAllStudents(e) {
            if (e.target.checked) {
                this.selectedBillIds =
                    this.billStudents.map(x => x.id);
            } else {
                this.selectedBillIds = [];
            }
        },
        getBills(){
            return axios.get('/SmBillingAndPayments/GetBills').then(res => {
                this.processedBills = res.data.filter(b => !b.isCancelled)
                this.schoolBills = res.data.filter(b => !b.isCancelled && (b.billingScopeId === 3 || b.billingScopeId === 0));
                this.levelBills = res.data.filter(b => !b.isCancelled && b.billingScopeId === 2)
                this.classBills = res.data.filter(b => !b.isCancelled && b.billingScopeId === 1)
            });
        },
        getFeeSetups(){
            return axios.get('/SmBillingAndPayments/GetFees/').then(res => {
                this.feeSetups = res.data;
            });
        },
        getBoardingFeeSetups(){
            return axios.get('/SmBillingAndPayments/GetBoardingFees/').then(res => {
                this.boardingFeeSetups = res.data;
            });
        },
        getBillingScopes(){
            return axios.get(`/jsonDataSample/billingScope.json?v=${new Date().getTime()}`).then(res => {
                this.billingScopes = res.data;
            });
        },
        getBillTypes(){
            return axios.get(`/jsonDataSample/billTypes.json?v=${new Date().getTime()}`).then(res => {
                this.billTypes = res.data;
            });
        },
        getBoardingItems(){
            return axios.get('/SmMainSetups/GetBoardingItems').then(res => {
                this.boardingFeeItems = res.data;
            });
        },
        getStandardItems(){
            return axios.get('/SmMainSetups/ListAllFeesDescriptions/').then(res => {
                this.standardFeeItems = res.data;
            });
        },
        getSupplementaryItems(){
            return axios.get('/SmMainSetups/ListAllSupplementaryItems/').then(res => {
                this.allSupplementaryFeeItems = res.data;
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
        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(res => {
                this.students = res.data;
                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName} `.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
            });
        },
        getStudentBills() {
            return axios.get('/SmBillingAndPayments/GetStudentBills').then(res => {
                this.studentBillInfo = res.data;
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
        formatMoney(value) {
            return Number(value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        getBillDropdown(){
            this.processedBills.forEach(bill => {
                const billAmount = bill.students?.[0]?.amount ?? 0;

                bill.billTypeName = this.getBillTypeName(bill.billTypeId);
                bill.billDate = this.formatDate(bill.billDate);
                bill.Amount = this.formatMoney(billAmount);
                bill.billIdentifier = `${bill.billTypeName} - ${bill.Amount} - ${bill.billNumber} / ${bill.billDate}`;
            })
            $('#billId').ejDropDownList({
                dataSource: this.processedBills,
                width: "100%",
                watermarkText: "Select Bill...",
                enableFilterSearch: true,
                fields: { id: "id", text: "billIdentifier", value: "id" },
                change: args => {
                    this.billId = args.value;

                    const bill = this.processedBills.find(
                        x => x.id === args.value
                    );

                    this.selectedBillStudents = bill?.students || [];
                    this.selectedStudentIds = [];
                }
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
        getAcademicYearName(academicYearId) {
            return this.academicYears.find(y => y.id === academicYearId)?.name || '';
        },
        getTermName(termId) {
            return this.terms.find(t => t.id === termId)?.name || '';
        },
        getScopeName(scopeId) {
            return this.billingScopes.find(s => s.id === scopeId)?.name || '';
        },
        getBillTypeName(billTypeId) {
            return this.billTypes.find(b => b.id === billTypeId)?.name || '';
        },
        isSelected(id) {
            return this.selectedBills.includes(id);
        },

        toggleSelectAll(e) {
            if (e.target.checked) {
                this.selectedBills = this.processedBills.map(b => b.id);
            } else {
                this.selectedBills = [];
            }
        },

        formatDate(dateStr) {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString('en-GB');
        },

        openCancelModal() {
            if (
                (this.cancelBy === 'By Student' && !this.selectedStudentIds.length) ||
                (this.cancelBy !== 'By Student' && !this.selectedBills.length)
            ) return;
            $('#cancelBillsModal').modal('show');
        },
        async cancelSelectedBills() {
            if (!this.selectedBills.length) {
                this.toastHandler('warning', 'Please select at least one bill.');
                return;
            }
            this.isCancelling = true;
            const result = await Swal.fire({
                title: 'Confirm Cancellation',
                text: 'Are you sure you want to cancel selected bill(s)?',
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
            try {
                const response = await axios.post(
                    '/SmBillingAndPayments/CancelMultipleBill',
                    {billIds: this.selectedBills}
                );

                $('#cancelBillsModal').modal('hide');

                this.selectedBills = [];

                this.toastHandler(
                    'success',
                    response.data?.message || 'Bills cancelled successfully.'
                );
                this.getBills();
            } catch (err) {
                const msg =
                    err.response?.data?.message ||
                    'Failed to cancel bills.';

                this.toastHandler('error', msg);
            } finally {
                this.isCancelling = false;
            }
        },
        async cancelSelectedStudents() {
            if (!this.selectedBillIds.length) {
                this.toastHandler(
                    'warning',
                    'Please select at least one bill.'
                );
                return;
            }

            try {
              
                const response = await axios.post(
                    '/SmBillingAndPayments/CancelStudentBills',
                    {
                        studentBillInfoIds: this.selectedBillIds,
                    }
                );

                this.toastHandler(
                    'success',
                    response.data.message
                );
                console.log('canceled bills for students:', this.selectedBillIds);
                this.selectedBillIds = [];

                this.getBills();

            } catch (err) {

                this.toastHandler(
                    'error',
                    err.response?.data?.message ||
                    'Failed to cancel student billing.'
                );
            }
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
    async mounted() {
        this.isShimmerLoading = true;

        try {
            // Needed for the form
            await Promise.all([
                this.getBills(),
                this.getAcademicYears(),
                this.getTerms(),
                this.getMainClasses(),
                this.getStreams(),
                this.getClasses(),
                this.getLevels(),
                this.getBillTypes(),
                this.getBillingScopes(),
                this.getStudents(),
                this.getStudentBills(),
                this.getFeeSetups(),
                this.getBoardingFeeSetups(),
                this.getStandardItems(),
                this.getSupplementaryItems(),
               
            ]);
            this.getBillDropdown();


        }
        catch (err) {
            console.error(err);
        }
        finally {
            this.isShimmerLoading = false;
        }

    },
    watch: {
        cancelBy(newVal) {
            if (newVal === 'By Student') {
                this.$nextTick(() => {
                    this.getBillDropdown();
                });
            }
        }
    }
});
app.component('shimmer-loader', ShimmerLoader);
app.mount('#app');