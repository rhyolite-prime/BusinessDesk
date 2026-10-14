const app = Vue.createApp({
    data() {
        return {
            file: null,
            previewRows: [],
            loading: false,
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            schClasses: [],
            academicYearId: '',
            termId: '',
            fromClassId: '',
            toClassId: '',
            isIndividualClass: true,
            isEntireLevel: false,
            isAlumni: false,
            entireLevelClassId: this.emptyGuid,
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            students: [],
            tableData: [],
            exists: false,
            lockInputs: false,
            promotions: [],
            allLevelClasses: [],
            filteredToClasses: [],
            missingPromotionStudents: [],
            toClassName: '',
            fromClassName: '',
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            selectAll: false,
            selected: false,
            statuses: [],
            searchQuery: '',
            page: 1,
            perPage: 10,
            studentStatus:[]
        }
    },
    mounted() {
        this.getStudentStatus();
        this.loadDropdowns();
        this.loadAllPromotions();
        
    },
    computed: {
        selectedStudents() {
            return this.tableData.filter(s => s.selected);
        },
        paginatedRows() {
            const start = (this.page - 1) * this.perPage;
            return this.tableData.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.tableData.length / this.perPage) || 1;
        }
    },
    methods: {
        toggleSelectAll() {
            this.tableData.forEach(s => {
                s.selected = this.selectAll;
            });
        },
        toggleSingleSelection() {
            this.selectAll = this.tableData.length > 0 &&
                this.tableData.every(s => s.selected);
        },
        loadAllPromotions() {
            axios.get('/SmResultsPromotions/GetAllPromotions/', {}).then(res => {
                this.promotions = res.data || [];

            });
        },
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        getStudentStatus() {
            return axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`)
                .then(res => {
                    this.studentStatus = res.data;
                });
        },
      
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),

            ]).then(axios.spread((years, classes, mainClasses, streams, students) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                const activeStatusIds = this.studentStatus
                    .filter(status => status.isActive === true)
                    .map(status => status.id);

                // Only keep students with an active status
                this.students = students.data.filter(student =>
                    activeStatusIds.includes(student.statusId)
                );

                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName || ''}`.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));

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
        handleClassSelectionChange() {
            if (!this.academicYearId || !this.fromClassId || !this.toClassId) {
                return;
            }

            this.validatePromotionInVue();
        },

        initDropdowns() {
            this.assignmentDate = new Date().toISOString().substr(0, 10);

            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.academicYearId = args.value;
                    this.tableData = [];
                },

                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }

            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim(),
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            const fromClassDropdown = this.classes
               /* .filter(c => !c.isHighestClass)*/  
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
            const toClassDropdown = this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            this.allLevelClasses = toClassDropdown;

            this.filteredToClasses = toClassDropdown;

            $('#toClassId').ejDropDownList({
                dataSource: toClassDropdown,
                width: "100%",
                watermarkText: "Select Promotion Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.toClassId = args.value;
                    this.toClassName = this.getClassName(this.toClassId);

                    if (!this.fromClassId) return;

                    this.$nextTick(() => {
                        this.validatePromotionInVue();
                    });
                }
            });


            $('#fromClassId').ejDropDownList({
                dataSource: fromClassDropdown,
                width: "100%",
                watermarkText: "Select Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.fromClassId = args.value;
                    this.fromClassName = this.getClassName(this.fromClassId);

                    this.populateFromClassStudents();

                    this.filteredToClasses = this.allLevelClasses.filter(
                        c => c.id !== this.fromClassId
                    );

                    $('#toClassId').ejDropDownList({
                        dataSource: this.filteredToClasses,
                        value: null
                    });

                    this.toClassId = this.emptyGuid;
                }
            });


        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        validatePromotionInVue() {

            const promotionsForToClass = this.promotions.filter(p =>
                p.academicYearId === this.academicYearId &&
                p.toClassId === this.toClassId
            );

            const toClassStudents = this.students.filter(s =>
                s.classId === this.toClassId
            );

            const promotedStudentIds = promotionsForToClass.map(p => p.studentId);

            const notPromotedStudents = toClassStudents.filter(
                s => !promotedStudentIds.includes(s.id)
            );

            if (notPromotedStudents.length > 0) {
                this.showPromotionModal(notPromotedStudents);
            }
        },

        showPromotionModal(missingStudents) {
            this.missingPromotionStudents = missingStudents;

            setTimeout(() => {
                $('#promotionWarningModal').modal({
                    backdrop: 'static',
                    keyboard: false
                }).modal('show');
            }, 150);
        },

        handlePromotionYes() {
            $('#promotionWarningModal').modal('hide');
            
            this.populateFromClassStudents(true);
        },

        handlePromotionNo() {
            $('#promotionWarningModal').modal('hide');
        },
        

        populateFromClassStudents(includeAlumni = false) {

            let students = this.students.filter(s =>
                s.classId === this.fromClassId
            );

            if (!includeAlumni) {
                students = students.filter(s => !s.isAlumni);
            }
            if (students.length === 0) {
                this.toastHandler('warning', 'No students found in the selected class.');
                this.tableData = [];
                return;
            }

            this.tableData = students.map(s => ({
                studentId: s.id,
                studentIdentifier: s.studentIdentifier,
                lastName: s.lastName,
                firstName: s.firstName,
                otherName: s.otherName,
                fromClassId: this.fromClassId,
                fromClassName: this.getClassName(this.fromClassId),
                selected: false
            }));
        },
        buildPromotionPayload() {
            const selected = this.selectedStudents;

            return {
                academicYearId: this.academicYearId,
                fromClassId: this.fromClassId,
                toClassId: this.toClassId,
                isIndividualClass: true,
                isEntireLevel: false,
                isAlumni: false,
                entireLevelClassId: this.emptyGuid,
                students: selected.map(s => ({
                    studentId: s.studentId,
                    studentIdentifier: s.studentIdentifier,
                    toClassId: this.toClassId
                }))
            };
        },

        confirmSavePromotions() {
            const selected = this.selectedStudents;

            if (!this.fromClassId || !this.toClassId) {
                this.toastHandler('warning', 'Please select a class to promote from and to.');
                return null;
            }
            if (!this.academicYearId) {
                this.toastHandler('warning', 'Please select an academic year.');
                return null;
            }

            if (selected.length === 0) {
                this.toastHandler('warning', 'Please select at least one student to promote.');
                return null;
            }
            setTimeout(() => {
                $('#confirmSaveModal').modal({
                    backdrop: 'static',
                    keyboard: false
                }).modal('show');
            }, 150);
        },
        onSavePromotionsYes() {
            $('#confirmSaveModal').modal('hide');
            this.savePromotions();
        },
        onSavePromotionsNo() {
            $('#confirmSaveModal').modal('hide');
        },
        savePromotions() {
            const payload = this.buildPromotionPayload();

            if (!payload) return;

            axios.post('/SmResultsPromotions/CreatePromotion', payload)
                .then(() => {
                    this.toastHandler('success', 'Students promoted successfully');
                    this.loadAllPromotions();
                    this.initDropdowns();
                    this.tableData = [];
                })
                .catch(() => {
                    this.toastHandler('error', 'Promotion failed');
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
});
app.mount('#app');