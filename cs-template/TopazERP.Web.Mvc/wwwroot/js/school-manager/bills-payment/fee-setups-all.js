const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            boardingItems: [],
            standardFeeItems:[],
            supplementaryFeeItems:[],
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
            feeTypes:[
                {
                    "id": 1,
                    "name": "Standard Fees"
                },
                {
                    "id": 2,
                    "name": "Supplementary Fees"
                },
                {
                    "id": 3,
                    "name": "Boarding Fees"
                }
            ],
            feeType:'',
            standardDetails: [],
            supplementaryDetails: [],
            boardingDetails: [],
            feeItemId:'',
            detailId:'',
            amount: 0,
            isClassFee:false,
            isLevelFee:false,
            isSchoolFee:true,
            activeTab: 'standard',
            feeSetups: [],
            boardingFeeSetups: [],
            isShimmerLoading: false,
            isLoading: false,
            foundExisting: false,
            selectedClassIds:[],
            selectAllClasses: false,
            classTable:[],
            levelClasses:[],
            allLevelClasses: [],
        }
    },
    computed: {
        feeItems() {
            switch (this.activeTab) {
                case 'standard':      return this.standardFeeItems;
                case 'supplementary': return this.supplementaryFeeItems;
                case 'boarding':      return this.boardingItems;
                default:              return [];
            }
        },
        activeDetails() {
            switch (this.activeTab) {
                case 'standard':
                    return this.standardDetails;
                case 'supplementary':
                    return this.supplementaryDetails;
                case 'boarding':
                    return this.boardingDetails;
                default:
                    return [];
            }
        },
        canAddDetail() {
            const last = this.activeDetails[this.activeDetails.length - 1];
            return !last || (last.feeItemId && last.amount > 0);
        },
        totalAmount() {
            return this.activeDetails.reduce((sum, d) => {
                return sum + (parseFloat(d.amount) || 0);
            }, 0);
        },
        /*filteredClassTable() {
            if (!this.classId) return this.allLevelClasses;
            return this.allLevelClasses.filter(c => c.id !== this.classId);
        }*/
        filteredClassTable() {
            const setupClassIds = this.activeTab === 'boarding'
                ? this.boardingFeeSetups
                    .filter(x => x.academicYearId === this.academicYearId && x.termId === this.termId)
                    .map(x => x.classId)
                : this.feeSetups
                    .filter(x =>
                        x.academicYearId === this.academicYearId &&
                        x.termId === this.termId &&
                        x.feeType.toLowerCase() === this.activeTab
                    )
                    .map(x => x.classId);

            return this.allLevelClasses.filter(c =>
                c.id !== this.classId && !setupClassIds.includes(c.id)
            );
        },
        classesWithSetups() {
            const setupClassIds = this.activeTab === 'boarding'
                ? this.boardingFeeSetups
                    .filter(x => x.academicYearId === this.academicYearId && x.termId === this.termId)
                    .map(x => x.classId)
                : this.feeSetups
                    .filter(x =>
                        x.academicYearId === this.academicYearId &&
                        x.termId === this.termId &&
                        x.feeType.toLowerCase() === this.activeTab
                    )
                    .map(x => x.classId);

            return this.allLevelClasses.filter(c => setupClassIds.includes(c.id));
        },
    },
    methods: {
        toggleAllClasses() {
            if (this.selectAllClasses) {
                this.selectedClassIds = this.filteredClassTable.map(c => c.id);
            } else {
                this.selectedClassIds = [];
            }
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        getFeeSetups() {
            return axios.get('/SmBillingAndPayments/GetFees/').then(response => {
                this.feeSetups = response.data;
                this.feeSetups.forEach(fee => {
                    fee.details.forEach(detail => {
                        // 2 decimal places for all amounts
                        detail.amount = parseFloat(detail.amount).toFixed(2);

                    });
                });
            }).catch(err => {
                this.toastHandler('error', 'Unable to get fees');
            });
        },

        getBoardingFeeSetups() {
            return axios.get('/SmBillingAndPayments/GetBoardingFees/').then(response => {
                this.boardingFeeSetups = response.data;
                this.boardingFeeSetups.forEach(fee => {
                    fee.details.forEach(detail => {
                        // 2 decimal places for all amounts
                        detail.amount = parseFloat(detail.amount).toFixed(2);

                    });
                });
            }).catch(err => {
                this.toastHandler('error', 'Unable to get boarding fees');
            });
        },
        getBoardingItems() {

           return axios.get('/SmMainSetups/GetBoardingItems').then(response => {

                this.boardingItems = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get boarding items.');

            });
        },
        getStandardFeeItems() {
            return axios.get('/SmMainSetups/ListAllFeesDescriptions/').then(response => {
                this.standardFeeItems = response.data;
                this.standardFeeItems.forEach(fee => {
                    fee.name = fee.description;
                })
            }).catch(err => {

                this.toastHandler('error', 'Unable to get fee items.');

            });
        },
        getSupplementaryFeeItems() {
            return axios.get('/SmMainSetups/ListAllSupplementaryItems/').then(response => {
                this.supplementaryFeeItems = response.data.filter(s=> !s.isFixed);
            }).catch(err => {
                this.toastHandler('error', 'Unable to get supplementary fee items.');
            });
        },
        loadDropdowns() {
            return axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllLevels/'),

            ]).then(axios.spread((years, term, classes, mainClasses, streams, levels) => {

                this.academicYears = years.data;
                this.terms = term.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.levels = levels.data;
                this.initDropdowns();
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
            const levelClassDropdown = this.getLevelClasses(this.levelId);
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.allLevelClasses = levelClassDropdown;  // add this line
            this.classTable = levelClassDropdown;
            /*$('#classId').ejDropDownList({
                dataSource: this.classesWithSetups,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
                    this.$nextTick(() => {
                        this.findExistingFeeSetup(
                            this.academicYearId,
                            this.termId,
                            this.classId,
                            this.levelId,
                            this.activeTab
                        );
                    });
                }
            });*/
            
            
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

        filterClassesByLevel() {

            const filtered = this.getLevelClasses(this.levelId);

            filtered.sort((a, b) => a.name.localeCompare(b.name));

            this.allLevelClasses = filtered;
            this.classTable = filtered;

            // reset selected class when level changes
            this.classId = null;

        },
        findExistingFeeSetup(academicYearId, termId, classId, levelId, feeType) {
            let existing = null;

            if (feeType === 'boarding') {
                existing = this.boardingFeeSetups.find(x =>
                    x.academicYearId === academicYearId &&
                    x.termId === termId &&
                    x.classId === classId
                );
            } else {
                existing = this.feeSetups.find(x =>
                    x.academicYearId === academicYearId &&
                    x.termId === termId &&
                    x.classId === classId &&
                    x.levelId === levelId &&
                    x.feeType.toLowerCase() === feeType
                );
            }

            if (!existing) {

                this.foundExisting = false;

                this.standardDetails = [];
                this.supplementaryDetails = [];
                this.boardingDetails = [];

                return;
            }

            this.foundExisting = true;
            this.populateDetails(existing, feeType);
        },
        populateDetails(existing, feeType) {

            if (feeType === 'boarding') {

                this.boardingDetails = existing.details.map(d => ({
                    id: d.id,
                    feeItemId: d.boardingItemId,
                    amount: d.amount
                }));

            } else {

                this.standardDetails = [];
                this.supplementaryDetails = [];

                const target = feeType === 'standard'
                    ? this.standardDetails
                    : this.supplementaryDetails;

                existing.details.forEach(d => {
                    target.push({
                        id: d.id,
                        feeItemId: d.feesItemId,
                        amount: d.amount
                    });
                });
            }
        },
        saveFeeSetup() {
            // Basic validation

            if (!this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select Academic Year and Term.');
                return;
            }
            if (this.feeScope === 'class' && !this.classId) {
                this.toastHandler('warning', 'Please select a Class.');
                return;
            }
            if (this.feeScope === 'level' && !this.levelId) {
                this.toastHandler('warning', 'Please select a Level.');
                return;
            }
            if (!this.activeDetails || this.activeDetails.length === 0) {
                this.toastHandler('warning', 'Please add at least one fee detail.');
                return;
            }
            if (this.activeDetails.some(d => d.amount <= 0)) {
                this.toastHandler('warning', 'Amount must be greater than zero.');
                return;
            }


            if (this.activeTab === 'boarding') {
                this.saveBoardingFee();
            } else {
                this.saveStandardOrSupplementaryFee();
            }
        },

        saveStandardOrSupplementaryFee() {
            if (!this.classId && this.selectedClassIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one Class.');
                return;
            }

            this.isLoading = true;
            // classes to save for
            const classIds = this.selectedClassIds.length > 0 ? this.selectedClassIds : [this.classId];
            const feeType =
                this.activeTab === 'standard'
                    ? 'Standard'
                    : 'Supplementary';
            // MULTIPLE CLASSES
                const payload = {
                    items: classIds.map(classId => ({
                        academicYearId: this.academicYearId,
                        termId: this.termId,
                        classId: classId,
                        levelId: this.levelId? this.levelId : this.emptyGuid,
                        isClassFee: true,
                        isLevelFee: false,
                        isSchoolFee: false,
                        feeType: feeType,
                        details: this.activeDetails.map(d => ({
                            id: this.uuid(),
                            feesItemId: d.feeItemId,
                            amount: d.amount
                        }))
                    }))
                };
                axios.post('/SmBillingAndPayments/CreateMultipleFees', payload)

                    .then(() => {
                        this.toastHandler(
                            'success',
                            'Fee setups saved successfully.'
                        );
                        this.getFeeSetups();
                        this.resetDetails();

                    })
                    .catch(() => {
                        this.toastHandler(
                            'error',
                            'Failed to save fee setups.'
                        );
                    })
                    .finally(() => {
                        this.isLoading = false;
                    });
        },

        saveBoardingFee() {
            if (!this.classId && this.selectedClassIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one Class.');
                return;
            }

            this.isLoading = true;
            const classIds =
                this.selectedClassIds.length > 0
                    ? this.selectedClassIds
                    : [this.classId];
            
                const payload = {
                    items: classIds.map(classId => ({
                        academicYearId: this.academicYearId,
                        termId: this.termId,
                        classId: classId,
                        details: this.boardingDetails.map(d => ({
                            id: d.id || this.uuid(),
                            boardingItemId: d.feeItemId,
                            amount: d.amount
                        }))
                    }))
                };
                axios.post('/SmBillingAndPayments/CreateMultipleBoardingFees', payload)
                    .then(() => {
                        this.toastHandler('success', 'Boarding fees saved successfully.');
                        this.getBoardingFeeSetups();
                        this.resetDetails();
                    })
                    .catch(() => {
                        this.toastHandler('error', 'Failed to save boarding fees.');
                    })
                    .finally(() => {
                        this.isLoading = false;
                    });
            
        },
        addDetail() {
            if (!this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select Academic Year and Term.');
                return;
            }
            const targetArray =
                this.activeTab === 'standard'
                    ? this.standardDetails
                    : this.activeTab === 'supplementary'
                        ? this.supplementaryDetails
                        : this.boardingDetails;

            targetArray.push({
                id: this.uuid(),
                feeItemId: '',
                amount: 0
            });
        },

        removeDetail(index) {
            if (this.activeTab === 'standard') {
                this.standardDetails.splice(index, 1);
            }
            else if (this.activeTab === 'supplementary') {
                this.supplementaryDetails.splice(index, 1);
            }
            else if (this.activeTab === 'boarding') {
                this.boardingDetails.splice(index, 1);
            }
        },
        resetDetails() {
            this.standardDetails = [];
            this.supplementaryDetails = [];
            this.boardingDetails = [];
            this.initDropdowns();
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
        academicYearId(newVal) {
            this.$nextTick(() => {
                this.findExistingFeeSetup(
                    this.academicYearId,
                    this.termId,
                    this.classId,
                    this.levelId,
                    this.activeTab
                );
            });
        },
        classId(newVal) {
            this.$nextTick(() => {
                this.findExistingFeeSetup(
                    this.academicYearId,
                    this.termId,
                    this.classId,
                    this.levelId,
                    this.activeTab
                );
            });
            if (newVal) {
                this.classTable = this.classTable.filter(c => c.id !== newVal);
                // Remove from selectedClassIds if it was selected
                this.selectedClassIds = this.selectedClassIds.filter(id => id !== newVal);
            }
        },
        levelId(newVal) {
            this.filterClassesByLevel();
            this.$nextTick(() => {
                this.findExistingFeeSetup(
                    this.academicYearId,
                    this.termId,
                    this.classId,
                    this.levelId,
                    this.activeTab
                );
            });
        },
        termId(newVal) {
            this.$nextTick(() => {
                this.findExistingFeeSetup(
                    this.academicYearId,
                    this.termId,
                    this.classId,
                    this.levelId,
                    this.activeTab
                );
            });
        },
        activeTab() {
            this.$nextTick(() => {
                this.initDropdowns();
                this.findExistingFeeSetup(
                    this.academicYearId,
                    this.termId,
                    this.classId,
                    this.levelId,
                    this.activeTab,
                );
            });
        },
        feeType() {
            if (this.feeType === 'standard' || this.feeType === 'supplementary') {
                this.classTable = this.classTable.filter(c => c.levelId === this.levelId);
            }
        },
        classTable: {
            deep: true,
            handler(val) {
                this.selectAllClasses =
                    val.length > 0 && val.every(c => c.selected);
            }
        },
        selectedClassIds() {
            this.selectAllClasses =
                this.filteredClassTable.length > 0 &&
                this.selectedClassIds.length === this.filteredClassTable.length;
        },
        classesWithSetups(newVal) {
            $('#classId').ejDropDownList('option', 'dataSource', newVal);
        },
    },
    async mounted() {
        await this.getFeeSetups();
        await this.getBoardingFeeSetups();
        await this.loadDropdowns();
        await this.getBoardingItems();
        await this.getStandardFeeItems();
        await this.getSupplementaryFeeItems();
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');