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
            isSchoolFee:false,
            feeScope: 'school',
            activeTab: 'standard',
            feeSetups: [],
            boardingFeeSetups: [],
            isShimmerLoading: false,
            isLoading: false,
            foundExisting: false,
            tenantId: null,
            feeSetUpId: null,
            classList: [],
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
        }
    },
    methods: {
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
            this.classList = levelClassDropdown;

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

            this.classList = filtered;

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
            this.feeSetUpId = existing.id;
            this.tenantId = existing.tenantId;
            this.populateDetails(existing, feeType);
        },
        populateDetails(existing, feeType) {

            if (feeType === 'boarding') {

                this.boardingDetails = existing.details.map(d => ({
                    id: d.id,
                    boardingFeeId: existing.id,
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
                        feeSetUpId: existing.id,
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
            if (this.feeScope === 'class' && (!this.classId || !this.levelId)) {
                this.toastHandler('warning', 'Please select a Level and Class.');
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
            this.isLoading = true;
            const payload = {
                id: this.feeSetUpId,
                academicYearId: this.academicYearId,
                termId: this.termId,
                classId: this.classId,
                levelId: this.levelId,
                isClassFee: true,
                isLevelFee: false,
                isSchoolFee: false,
                feeType: this.activeTab === 'standard' ? 'Standard' : 'Supplementary',
                tenantId: this.tenantId,
                details: this.activeDetails.map(d => ({
                    id: d.id || this.emptyGuid,
                    feeSetUpId: this.feeSetUpId || this.emptyGuid,
                    feesItemId: d.feeItemId,
                    amount: d.amount
                }))
            };

            axios.post('/SmBillingAndPayments/UpdateFee', payload)
                .then(response => {
                    this.toastHandler('success', 'Fee setup updated successfully.');
                    this.getFeeSetups();
                    this.getBoardingFeeSetups();
                    this.resetDetails();
                    this.isLoading = false;
                })
                .catch(err => {
                    this.isLoading = false;
                    this.toastHandler('error', 'Failed to update fee setup.');
                });
        },

        saveBoardingFee() {
            this.isLoading = true;
            if (!this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select Academic Year and Term.');
                return;
            }
            const payload = {
                id: this.feeSetUpId,
                academicYearId: this.academicYearId,
                termId: this.termId,
                classId: this.classId,
                tenantId: this.tenantId,
                details: this.boardingDetails.map(d => ({
                    id: d.id || this.emptyGuid,
                    boardingFeeId: this.feeSetUpId || this.emptyGuid,
                    boardingItemId: d.feeItemId,
                    amount: d.amount
                }))
            };

            axios.post('/SmBillingAndPayments/UpdateBoardingFee', payload)
                .then(response => {
                    this.toastHandler('success', 'Boarding fee updated successfully.');
                    this.getBoardingFeeSetups();
                    this.resetDetails();
                    this.isLoading = false;
                })
                .catch(err => {
                    this.isLoading = false;
                    this.toastHandler('error', 'Failed to updated boarding fee.');
                });
        },
        addDetail() {
            if (!this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select Academic Year and Term.');
                return;
            }
            if (this.feeScope === 'class' && (!this.classId || !this.levelId)) {
                this.toastHandler('warning', 'Please select a Level and Class.');
                return;
            }
            if (this.feeScope === 'level' && !this.levelId) {
                this.toastHandler('warning', 'Please select a Level.');
            }
            const targetArray =
                this.activeTab === 'standard'
                    ? this.standardDetails
                    : this.activeTab === 'supplementary'
                        ? this.supplementaryDetails
                        : this.boardingDetails;

            const emptyRowExists = targetArray.some(x => !x.feeItemId);

            if (emptyRowExists) {
                this.toastHandler('warning', 'Please select the fee item before adding another one.');
                return;
            }
            
            
            
            targetArray.unshift({
                id: this.uuid(),
                feeItemId: '',
                amount: 0
            });
            this.$nextTick(() => {
                this.$refs.newFeeItem?.focus();
            });
        },
        checkDuplicateFeeItem(detail) {
            const targetArray =
                this.activeTab === 'standard'
                    ? this.standardDetails
                    : this.activeTab === 'supplementary'
                        ? this.supplementaryDetails
                        : this.boardingDetails;

            const count = targetArray.filter(
                x => x.feeItemId === detail.feeItemId
            ).length;

            if (count > 1) {
                this.toastHandler('warning', 'This fee item has already been added.');

                detail.feeItemId = '';
            }
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
        async deleteFee(id) {
            this.isLoading = true;
            const result = await Swal.fire({
                title: 'Confirm Delete',
                text: `Are you sure you want to delete this fee setup?`,
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
            if (this.activeTab === 'standard' || this.activeTab === 'supplementary') {
                axios.delete(`/SmBillingAndPayments/DeleteFee?id=${id}`)
                    .then(response => {
                        this.toastHandler('success', 'Fee setup deleted successfully.');
                        this.getFeeSetups();
                        this.resetDetails();
                        $('#deleteModal').modal('hide');
                    })
                    .catch(err => {
                        $('#deleteModal').modal('hide');
                        this.toastHandler('error', 'Failed to delete fee setup.');
                    })
                    .finally(() => {
                        this.isLoading = false;
                    })
            } else if (this.activeTab === 'boarding') {
                axios.delete(`/SmBillingAndPayments/DeleteBoardingFee?id=${id}`)
                    .then(response => {
                        this.toastHandler('success', 'Boarding fee deleted successfully.');
                        this.getBoardingFeeSetups();
                        this.resetDetails();
                    })
                    .catch(err => {
                        this.toastHandler('error', 'Failed to delete boarding fee.');
                    })
            }
        },
        openDeleteModal() {

            $('#deleteModal').modal('show');
        },
        closeDeleteModal() {
            this.isLoading = false;
            $('#deleteModal').modal('hide');
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
        feeScope(newVal) {

            this.$nextTick(() => {

                // RESET FLAGS FIRST
                this.isClassFee = false;
                this.isLevelFee = false;
                this.isSchoolFee = false;

                // CLASS SCOPE
                if (newVal === 'class') {

                    this.isClassFee = true;

                    this.initDropdowns();

                    this.findExistingFeeSetup(
                        this.academicYearId,
                        this.termId,
                        this.classId,
                        this.levelId,
                        this.activeTab,
                        newVal
                    );
                }

                // LEVEL SCOPE
                if (newVal === 'level') {

                    this.isLevelFee = true;

                    this.classId = this.emptyGuid;

                    this.initDropdowns();

                    this.findExistingFeeSetup(
                        this.academicYearId,
                        this.termId,
                        this.classId,
                        this.levelId,
                        this.activeTab,
                        newVal
                    );
                }

                // SCHOOL SCOPE
                if (newVal === 'school') {

                    this.isSchoolFee = true;

                    this.classId = this.emptyGuid;
                    this.levelId = this.emptyGuid;

                    this.findExistingFeeSetup(
                        this.academicYearId,
                        this.termId,
                        this.classId,
                        this.levelId,
                        this.activeTab,
                        newVal
                    );
                }
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
                    this.activeTab
                );
            });
        }
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