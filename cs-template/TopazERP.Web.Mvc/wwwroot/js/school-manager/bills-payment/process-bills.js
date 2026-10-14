const app = Vue.createApp({
    data() {
        return {
            processedBills: [],
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            boardingFeeItems: [],
            standardFeeItems:[],
            supplementaryFeeItems:[],
            supplementaryItemId: '',
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            levels: [],
            academicYearId: '',
            termId: this.emptyGuid,
            classId: this.emptyGuid,
            levelId:this.emptyGuid,
            billTypes:[],
            standardFees: [],
            supplementaryFees: [],
            boardingFees: [],
            feeItemId:'',
            detailId:'',
            amount: 0,
            billScopes:[],
            students:[],
            billScope: 'school',
            activeTab: 'standard',
            feeSetups: [],
            boardingFeeSetups: [],
            isShimmerLoading: false,
            isLoading: false,
            foundExistingFee: false,
            classList: [],
            billDetails:[],
            billNumber:'',
            billDate: new Date().toISOString().substr(0, 10),
            billScopeId: 1,
            isProcessed: false,
            batchNumber: '',
            supplementaryFeeId:'',
            billedStudents:[],
            feeSetupDetails:[],
            selectedFeeSetupDetails: [],
            className: '',
            selectedFeeIds: [],
            isFixedBill: false,
            allSupplementaryFeeItems: [],
            fixedBillAmount: 0,
            supplementaryStudentsTableData: [],
            foundExistingBills: false,
            billId: null,
            updateBill: false,
            tenantId: null,
            studentsTableData: [],
            existingData: [],
            isUpdate: false,
            page: 1,
            perPage: 10,
            searchText: '',
            sortKey: '',
            sortAsc: true,
            foundFeeSetup: false,
            studentStatus: [],
        }
    },
    computed: {
        feeType() {
            switch (this.activeTab) {
                case 'standard':      return 'Standard';
                case 'supplementary': return 'Supplementary';
                case 'boarding':      return 'Boarding';
                default:              return 'Standard';
            }
        },
        billTypeId() {
            switch (this.activeTab) {
                case 'standard':     return 1;
                case 'supplementary': return 2;
                case 'boarding':      return 3;
                default:              return 1;
            }
        },
        selectedFeeSetup() {
            return this.findFeeSetup();
        },

        hasFeeSetup() {
            return !!this.selectedFeeSetup;
        },
        activeDetails() {
            const setup = this.selectedFeeSetup;
            if (!setup || !setup.details) return [];
            
            return setup.details.map(d => {
                const feeItemId =
                    this.activeTab === 'boarding'
                        ? d.boardingItemId
                        : d.feesItemId;

                return {
                    feeItemId,
                    amount: d.amount,
                    name: this.getFeeItemName(this.activeTab, feeItemId)
                };
            });
        },
        activeSupplementaryDetails() {
            // isFixedBill: return a single editable row for the selected supplementary item
            if (this.isFixedBill) {
                if (!this.supplementaryItemId) return [];
                return [{
                    feeItemId: this.supplementaryItemId,
                    amount: this.fixedBillAmount ?? 0,
                    name: this.getFeeItemName(this.activeTab, this.supplementaryItemId)
                }];
            }

            // isFixedBill false: get from existing setup as before
            const setup = this.selectedFeeSetup;
            if (!setup || !setup.details) return [];

            let details = setup.details;

            if (this.billTypeId === 2) {
                if (!this.supplementaryItemId) return [];
                details = details.filter(d => d.feesItemId === this.supplementaryItemId);
            }

            return details.map(d => ({
                feeItemId: d.feesItemId,
                amount: d.amount,
                name: this.getFeeItemName(this.activeTab, d.feesItemId)
            }));
        },
        totalSupplementaryAmount() {
            return this.activeSupplementaryDetails
                .filter(f => this.selectedFeeIds.includes(f.feeItemId))
                .reduce((sum, d) => {
                    return sum + (parseFloat(d.amount) || 0);
                }, 0);
        },
        totalAmount() {
            return this.activeDetails
                .filter(f => this.selectedFeeIds.includes(f.feeItemId))
                .reduce((sum, d) => {
                    return sum + (parseFloat(d.amount) || 0);
                }, 0);
        },
        selectAllStudents: {
            get() {
                if (this.billTypeId !== 2) {
                    return this.studentsTableData.length > 0 &&
                        this.studentsTableData.every(s => s.toBeBilled);
                } else {
                    return this.supplementaryStudentsTableData.length > 0 &&
                        this.supplementaryStudentsTableData.every(s => s.toBeBilled);
                }
            },
            set(value) {
                if (this.billTypeId !== 2) {
                    this.studentsTableData.forEach(s => s.toBeBilled = value);
                } else {
                    this.supplementaryStudentsTableData.forEach(s => s.toBeBilled = value);
                }
            }
        },
        selectAllFees: {
            get() {
                if (this.billTypeId !== 2)
                {
                    return this.activeDetails.length > 0 &&
                        this.activeDetails.every(f =>
                            this.selectedFeeIds.includes(f.feeItemId)
                        );
                } else 
                {
                    return this.activeSupplementaryDetails.length > 0 &&
                        this.activeSupplementaryDetails.every(f =>
                            this.selectedFeeIds.includes(f.feeItemId)
                        );
                }
            },
            set(value) {
                if (this.billTypeId !== 2) 
                {
                    if (value) {
                        this.selectedFeeIds = this.activeDetails.map(
                            f => f.feeItemId
                        );
                    } else 
                    {
                        this.selectedFeeIds = [];
                    }   
                } else {
                    if (value) {
                        this.selectedFeeIds = this.activeSupplementaryDetails.map(
                            f => f.feeItemId
                        );
                    } else {
                        this.selectedFeeIds = [];
                    }
                }
                
            }
        },
        supplementaryStudentsTable() {
            return this.supplementaryStudentsTableData;
        },
        totalSupplementaryAmountStudents() {
            return this.supplementaryStudentsTableData
                .filter(s => s.toBeBilled)
                .reduce((sum, s) => sum + this.calculateStudentAmount(s), 0);
        },
        studentsTable() {
            return this.studentsTableData;
        },
        totalAmountStudents() {
            return this.studentsTableData
                .filter(s => s.toBeBilled)
                .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        },
        filteredData() {
            let rows = [];
            if (this.billTypeId === 2) {
                rows = this.supplementaryStudentsTable;
            }
            else {
                 rows = this.studentsTable;
            }
            if (this.searchText) {
                const search = this.searchText.toLowerCase().trim();

                rows = rows.filter(r => {
                    return (
                        (this.formatStudentName(r) || '').toLowerCase().includes(search) ||
                        (r.className && r.className.toLowerCase().includes(search)) ||
                        (r.amount && r.amount.toString().includes(search)) ||
                        (r.discountAmount && r.discountAmount.toString().includes(search)) ||
                        (r.discountPercentage && r.discountPercentage.toString().includes(search))
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
        totalPages() {
            return Math.ceil(this.filteredData.length / this.perPage) || 1;
        },
        paginatedData() {
            const start = (this.page - 1) * this.perPage;
            return this.filteredData.slice(start, start + this.perPage);
        },
        dataCount(){
            if (this.billTypeId === 2) {
                return this.supplementaryStudentsTableData.length;
            } else {
                return this.studentsTableData.length;
            }
        }
    },
    methods: {
        nextPage() {
            if (this.page < this.totalPages) this.page++;
        },

        prevPage() {
            if (this.page > 1) this.page--;
        },
        sort(key) {
            if (this.sortKey === key) {
                this.sortAsc = !this.sortAsc;
            } else {
                this.sortKey = key;
                this.sortAsc = true;
            }
        },
        buildStudentsTable() {
            // Only for non-supplementary bill types
            if (this.billTypeId === 2) return;

            const amount = parseFloat(this.totalAmount) || 0;
            let students = [];
            students = this.students.filter(s =>
                    s.classId === this.classId && !s.isAlumni
            );
            if (this.billTypeId === 3){
                students = this.students.filter(s =>  s.classId === this.classId && !s.isAlumni && s.isBoarder);
            }

            // Preserve existing row edits (toBeBilled, discounts)
            const existingMap = {};
            this.studentsTableData.forEach(r => {
                existingMap[r.studentId] = r;
            });

            this.studentsTableData = students.map(s => {
                const levelClasses = this.getAllClasses(s.classId);
                const className = levelClasses.find(c => c.id === s.classId)?.name || '';
                const existing = existingMap[s.id];

                return {
                    ...s,
                    id: existing ? existing.id : this.uuid(),
                    studentId: s.id,
                    classId: s.classId,
                    className,
                    toBeBilled:         existing ? existing.toBeBilled         : true,
                    isDiscounted:       existing ? existing.isDiscounted       : false,
                    discountAmount:     existing ? existing.discountAmount     : 0,
                    discountPercentage: existing ? existing.discountPercentage : 0,
                    amount
                };
            });
        },
        autoSelectSupplementaryFees() {
            if (this.billTypeId === 2) {
                this.selectedFeeIds = this.activeSupplementaryDetails.map(f => f.feeItemId);
            }
        },
        buildSupplementaryStudentsTable() {
            const amount = this.isFixedBill ? (parseFloat(this.fixedBillAmount) || 0) : (parseFloat(this.totalSupplementaryAmount) || 0);
            let students = [];

            // BOARDING
            if (this.billTypeId === 3) {
                students = this.students.filter(s => !s.isAlumni && s.isBoarder);
            }
            // STANDARD / SUPPLEMENTARY
            else if (this.billTypeId === 1 || this.billTypeId === 2) {
                if (this.billScopeId === 1) {
                    students = this.students.filter(s =>
                        s.classId === this.classId && !s.isAlumni
                    );
                } else if (this.billScopeId === 2) {
                    const levelClassIds = this.getLevelClasses(this.levelId).map(c => c.id);
                    students = this.students.filter(s =>
                        levelClassIds.includes(s.classId) && !s.isAlumni
                    );
                } else if (this.billScopeId === 3) {
                    students = this.students.filter(s => !s.isAlumni);
                }
            }

            this.supplementaryStudentsTableData = students.map(s => {
                const levelClasses = this.getAllClasses(s.classId);
                const className = levelClasses.find(c => c.id === s.classId)?.name || '';
                return {
                    ...s,
                    id: this.uuid(),
                    studentId: s.id,
                    classId: s.classId,
                    className,
                    toBeBilled: true,
                    isDiscounted: false,
                    discountAmount: 0,
                    discountPercentage: 0,
                    amount
                };
            });
        },
        calculateStudentAmount(s) {
            if (this.isFixedBill) {
                return parseFloat(this.fixedBillAmount) || 0;
            }

            const base = parseFloat(s.amount) || 0;
            if (!s.isDiscounted) return base;

            // Discount amount takes priority
            if (parseFloat(s.discountAmount) > 0) {
                return Math.max(0, base - parseFloat(s.discountAmount));
            }

            if (parseFloat(s.discountPercentage) > 0) {
                const pct = Math.min(100, parseFloat(s.discountPercentage));
                return Math.max(0, base - (base * pct / 100));
            }

            return base;
        },
        toggleAllStudents() {
            this.students.forEach(s => {
                s.toBeBilled = this.selectAllStudents;
            });
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        getBills(){
            return axios.get('/SmBillingAndPayments/GetBills').then(res => {
                this.processedBills = res.data.filter(b => !b.isCancelled)
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
                this.billScopes = res.data;
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
        getStudentStatus() {
            return axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`).then(res => {
                this.studentStatus = res.data;
            });
        },
        /*getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(res => {
                const students = res.data;
                const activeStatusIds = this.studentStatus
                    .filter(status => status.isActive === true)
                    .map(status => status.id);

                // Only keep students with an active status
                this.students = students.filter(student =>
                    activeStatusIds.includes(student.statusId)
                );
                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName || ''}`.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
            });
        },*/

        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/')
                .then(res => {

                    // Get IDs of statuses that are considered active
                    const activeStatusIds = this.studentStatus
                        .filter(status => status.isActive === true)
                        .map(status => status.id);

                    // Only keep students with an active status
                    this.students = res.data.filter(student =>
                        activeStatusIds.includes(student.statusId)
                    );
                    this.students.forEach(s => {
                        s.name = `${s.lastName} ${s.firstName} ${s.otherName || ''}`.trim();
                        s.displayText = `${s.studentIdentifier} - ${s.name}`;
                    });
                });
        },
        async generateBillNumbers() {
            const billedStudents = this.billTypeId === 2
                ? this.supplementaryStudentsTableData
                : this.studentsTableData;

            // Get unique class IDs for students that will actually be billed
            const classIds = [...new Set(
                billedStudents
                    .filter(s => s.toBeBilled)
                    .map(s => s.classId)
            )];

            // Request bill numbers for all classes in parallel
            const responses = await Promise.all(
                classIds.map(classId =>
                    axios.get(
                        `/SmBillingAndPayments/GetBillNumber?academicYearId=${this.academicYearId}&termId=${this.termId}&classId=${classId}`
                    ).then(res => ({
                        classId,
                        billNumber: res.data
                    }))
                )
            );

            // Build lookup
            const billNumberLookup = {};

            responses.forEach(r => {
                billNumberLookup[r.classId] = r.billNumber;
            });

            // Assign bill number to every billed student
            billedStudents.forEach(student => {
                student.billNumber = billNumberLookup[student.classId];
            });
            const firstStudent = billedStudents[0];
            this.billNumber = billNumberLookup[firstStudent.classId];
            console.log(billNumberLookup);
            return billNumberLookup;
        },
        generateBatchNumber() {
            const bills = this.processedBills || [];

            let existingBatch = null;

            // Boarding (type 3) — match on year + term + billType only
            if (this.billTypeId === 3) {
                existingBatch = bills.find(b =>
                    b.academicYearId === this.academicYearId &&
                    b.termId === this.termId &&
                    b.billingScopeId === 0 &&
                    b.billTypeId === this.billTypeId
                );
            } else {
                if (this.billTypeId === 1 || this.billTypeId === 2) {
                    existingBatch = bills.find(b =>
                        b.academicYearId === this.academicYearId &&
                        b.termId === this.termId &&
                        b.billingScopeId === this.billScopeId &&
                        b.levelId === this.levelId &&
                        b.classId === this.classId &&
                        (b.billTypeId === 1 || b.billTypeId === 2)
                    );
                }
            }

            const batchNumber = existingBatch
                ? existingBatch.batchNumber
                : Math.floor(10000 + Math.random() * 90000).toString();

            this.batchNumber = batchNumber;
            return batchNumber;
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        getFeeItemName(feeType, feeItemId) {
            const type = feeType.toLowerCase();
            if (type === 'standard') {
                const item = this.standardFeeItems.find(item => item.id === feeItemId);
                return item ? item.description : 'Unknown';
            }

            if (type === 'supplementary') {
                const item = this.supplementaryFeeItems.find(item => item.id === feeItemId);
                return item ? item.name : 'Unknown';
            }

            if (type === 'boarding') {
                const item = this.boardingFeeItems.find(item => item.id === feeItemId);

                return item ? item.name : 'Unknown';
            }
           
            return 'Unknown';
            
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
        filterSupplementaryItems() {
            if (this.isFixedBill) {
                // Fixed bill mode: show only items flagged as fixed  
                this.supplementaryFeeItems = this.allSupplementaryFeeItems.filter(s =>
                    s.isFixed
                );
            } else {
                // Non-fixed bill mode: show only items that exist in the found fee setup details  
                const setup = this.selectedFeeSetup;
                if (setup && setup.details && setup.details.length > 0) {
                    const detailFeeItemIds = setup.details.map(d => d.feesItemId);
                    this.supplementaryFeeItems = this.allSupplementaryFeeItems.filter(s =>
                        detailFeeItemIds.includes(s.id)
                    );
                } else {
                    this.supplementaryFeeItems = [];
                }
            }
            
        },
        getLevelClasses() {
            if (!this.levelId) {
                return this.classes.map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
            }
            return this.classes
                .filter(c => c.levelId === this.levelId)
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }))
              
        },
        getAllClasses(classId) {
            return this.classes
                .filter(c => c.id === classId)
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`
                }));
        },
        filterClassesByLevel(levelId) {

            const filtered = this.getLevelClasses(levelId);

            filtered.sort((a, b) => a.name.localeCompare(b.name));

            this.classList = filtered;

            // reset selected class when level changes
            this.classId = null;
            
        },
        findFeeSetup() {
            let setup = null;

            const tab = this.activeTab?.toLowerCase();

            if (!tab) return null;

            if (tab === 'boarding') {
                setup = this.boardingFeeSetups.find(x =>
                    x.academicYearId === this.academicYearId &&
                    x.termId === this.termId &&
                    x.classId === this.classId
                );

            } else {
                setup = this.feeSetups.find(x =>
                        x.academicYearId === this.academicYearId &&
                        x.termId === this.termId &&
                        x.classId === this.classId &&
                        x.feeType.toLowerCase() === tab
                );
            }

            return setup;
        },
        findBill (params) {
           return axios.post('/SmBillingAndPayments/CheckExistingBill', params);
       },
        async checkExistingBill() {
            this.foundExistingBills = false;
            this.isUpdate = false;

            if (!this.academicYearId || !this.termId) {
                return false;
            }

            const payload = {
                academicYearId: this.academicYearId,
                termId: this.termId,
                billTypeId: this.billTypeId,
                classId: this.classId,
                feeItemId: this.supplementaryItemId
            };

            try {
                const res = await this.findBill(payload);

                const exists = res.data?.result ?? res.data;

                if (exists) {
                    this.foundExistingBills = true;
                    this.isUpdate = true;
                    this.toastHandler('warning', 'Processed Bill already exists');
                }

                return exists;

            } catch (error) {
                console.error("CheckExistingBill failed:", error);
                return false;
            }
        },
        async saveBills() {
            if (this.foundExistingBills){
                this.toastHandler('error', 'Bill already exists!')
            }
            if (!this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select Academic Year and Term.');
                return;
            }
            if (this.billScopeId === 1 && (!this.classId || !this.levelId)) {
                this.toastHandler('warning', 'Please select a Level and Class.');
                return;
            }
            if (this.billScopeId === 2 && !this.levelId) {
                this.toastHandler('warning', 'Please select a Level.');
                return;
            }

            await this.processBills();

        },
        async processBills() {
            const billDetails = this.billTypeId === 2
                ? this.activeSupplementaryDetails
                : this.activeDetails;

            const billedStudents = this.billTypeId === 2
                ? this.supplementaryStudentsTableData
                : this.studentsTableData;

            const payload = {
                academicYearId: this.academicYearId,
                termId: this.termId,
                classId: this.classId ? this.classId : this.emptyGuid,
                levelId: this.levelId ? this.levelId : this.emptyGuid,
                billingScopeId: this.billScopeId,
                billTypeId: this.billTypeId,
                billDate: this.billDate,
                billNumber: this.billNumber,
                batchNumber: this.batchNumber,
                isProcessed: true,
                details: billDetails.map(d => ({
                    id: this.uuid(),
                    feeItemId: d.feeItemId,
                    amount: d.amount
                })),
                students: billedStudents.map(s => ({
                    id: s.id,
                    studentId: s.studentId,
                    toBeBilled: s.toBeBilled,
                    isDiscount: s.isDiscounted,
                    discountAmount: s.discountAmount,
                    discountPercentage: s.discountPercentage,
                    amount: this.calculateStudentAmount(s)
                }))
            };
            const result = await Swal.fire({
                title: 'Confirm Save',
                text: 'Are you sure you want to process this bill? This action will affect student statement.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'Cancel',
            });

            if (!result.isConfirmed) {
                return;
            }
            this.isLoading = true;
            axios.post('/SmBillingAndPayments/CreateBill', payload)
                .then(() => {
                    this.toastHandler('success', 'Bill processed successfully.');
                    this.isLoading = false;
                    this.resetBill();
                })
                .catch(() => {
                    this.isLoading = false;
                    this.resetBill();
                    this.toastHandler('error', 'Failed to process bill.');
                });
        },
        resetBill() {
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
        triggerBillCheck() {
            this.$nextTick(async () => {
                await this.checkExistingBill();
            });
        },
    },
    watch: {
        supplementaryItemId:{
            handler() {
                this.$nextTick(async () => {
                    this.buildSupplementaryStudentsTable();
                    await this.triggerBillCheck();
                })
            }
          
        },
        students: {
            deep: false,
            handler() {
                this.buildStudentsTable();
                this.buildSupplementaryStudentsTable();
            }
        },
        academicYearId(newVal, oldVal) {
            if (newVal === oldVal) return;
                this.$nextTick(() => {
                    this.findFeeSetup();
                });
        },
        termId: {
            handler() {
                /*if (this.billScopeId === 3 || this.billTypeId === 3) {
                    this.triggerBillCheck();
                }*/
                this.$nextTick(() => {
                    this.findFeeSetup();
                    this.generateBatchNumber();
                });
            }
        },
        billTypeId: {
            handler() {
                this.$nextTick(() => {
                  /*  if (this.billTypeId === 3) {
                        this.billScopeId = 0;
                        this.classId = this.emptyGuid;
                        this.levelId = this.emptyGuid;
                    }*/
                    this.buildStudentsTable();
                    this.buildSupplementaryStudentsTable();
                });
            }
        },
      /*  billScopeId: {
            handler(newVal) {
                this.$nextTick(() => {
                    this.buildStudentsTable();
                    this.buildSupplementaryStudentsTable();
                    this.initDropdowns();
                     if (newVal !== 0) {
                         this.triggerBillCheck();
                     }
                   if (newVal === 2) {
                        this.classId = this.emptyGuid;
                    } else if (newVal === 3) {
                        this.classId = this.emptyGuid;
                        this.levelId = this.emptyGuid;
                    }
                    this.findFeeSetup();
                    this.filterSupplementaryItems();
                });
            }
        },*/
        classId: {
            async handler() {
                this.$nextTick(() => {
                    this.findFeeSetup();
                    this.generateBatchNumber();
                   /* if (this.billScopeId === 1) {
                        this.triggerBillCheck();
                    }*/
                    this.triggerBillCheck();
                });
                this.buildStudentsTable();
                this.buildSupplementaryStudentsTable();
                this.filterSupplementaryItems();
            }
        },
        levelId(val) {
                this.filterClassesByLevel(val);
                this.buildStudentsTable();
                this.buildSupplementaryStudentsTable();
                this.filterSupplementaryItems();
               /* if (this.billScopeId === 2) {
                    this.triggerBillCheck();
                }*/
                this.$nextTick(() => {
                    this.generateBatchNumber();
                    this.findFeeSetup();
                });
        },
        totalAmount: {
            handler() {
                this.buildStudentsTable();
                this.buildSupplementaryStudentsTable();
            }
        },
        totalSupplementaryAmount: {
            handler() {
                this.buildSupplementaryStudentsTable();
            }
        },
        fixedBillAmount: {
            handler() {
                this.buildSupplementaryStudentsTable();
            }
        },
        activeDetails: {
            immediate: true,
            handler(newVal) {
                if (!newVal || newVal.length === 0) return;
                this.selectedFeeIds = newVal.map(x => x.feeItemId);
            }
        },
        activeSupplementaryDetails: {
            deep: false,
            handler(newDetails) {
                if (newDetails.length > 0) {
                    this.$nextTick(() => this.autoSelectSupplementaryFees());
                }
            }
        },
        activeTab: {
            handler() {
                this.$nextTick(() => {
                    this.initDropdowns();
                    this.filterSupplementaryItems();
                    this.triggerBillCheck();
                });
            }
        },
        isFixedBill: {
            handler() {
                this.filterSupplementaryItems();
                this.buildSupplementaryStudentsTable();
                this.$nextTick(() => this.autoSelectSupplementaryFees());
            }
        },
    },
    async mounted() {
        this.isShimmerLoading = true;

        try {
            // Needed for the form
            await Promise.all([
                this.getStudentStatus(),
                this.getAcademicYears(),
                this.getTerms(),
                this.getMainClasses(),
                this.getStreams(),
                this.getClasses(),
                this.getLevels(),
                this.getBillTypes(),
                this.getBillingScopes(),
                this.getStudents(),
                this.getFeeSetups(),
                this.getBoardingFeeSetups(),
                this.getStandardItems(),
                this.getSupplementaryItems(),
                this.getBoardingItems()
                
            ]);
            this.getBills();
            this.generateBatchNumber();
            
        }
        catch (err) {
            console.error(err);
        }
        finally {
            this.isShimmerLoading = false;
        }
       
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');