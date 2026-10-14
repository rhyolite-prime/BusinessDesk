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
            isIndividualClass: false,
            isEntireLevel: true,
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
            
        }
    },
    mounted() {
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

                if (!this.selectAll) {
                    s.toClassId = this.emptyGuid;
                } else {
                    const defaultClass = this.getDefaultToClass(s.fromLevelClassId);
                    s.toClassId = defaultClass ? defaultClass : this.emptyGuid;
                }
            });
        },

        toggleSingleSelection(student) {
            if (!student.selected) {
                student.toClassId = this.emptyGuid;
            } else {
                const defaultClass = this.getDefaultToClass(student.fromLevelClassId);
               // const defaultToClass = this.getDefaultToClass(student.classId);
                student.toClassId = defaultClass ? defaultClass : this.emptyGuid;
            }

            this.selectAll = this.tableData.every(s => s.selected);
        },
        loadAllPromotions() {
            axios.get('/SmResultsPromotions/GetAllPromotions/', {}).then(res => {
                this.promotions = res.data || [];

            });
        },

        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`),

            ]).then(axios.spread((years, classes, mainClasses, streams, students, statuses) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.statuses = statuses.data;

                const studentsList = students.data.filter(s => s.isAlumni === false);
                const activeStatusIds = this.statuses
                    .filter(status => status.isActive === true)
                    .map(status => status.id);

                // Only keep students with an active status
                this.students = studentsList.filter(student =>
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
        getLevelClass(levelClassId) {
            return this.classes.find(c => c.id === levelClassId);
        },
        getToClassOptions(studentLevelClassId) {
            const current = this.getLevelClass(studentLevelClassId);
            if (!current) return [];

            return this.classes
                .filter(c =>
                    c.levelId === current.levelId &&
                    c.id !== current.id
                )
                .map(c => ({
                    id: c.id,
                    name: `${c.className} ${c.streamName}`.trim(),
                    streamId: c.streamId
                }));
        },
        getDefaultToClass(studentLevelClassId) {
            const current = this.getLevelClass(studentLevelClassId);
            if (!current) return '';

            const sameLevelClasses = this.classes.filter(c =>
                c.levelId === current.levelId &&
                c.id !== current.id
            );
             sameLevelClasses.sort((a, b) => a.ordinal - b.ordinal);
            const sameStream = sameLevelClasses.find(c =>
                c.streamId === current.streamId
            );

            return (sameStream || sameLevelClasses[0])?.id || '';
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
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.allLevelClasses = levelClassDropdown;

            this.filteredToClasses = levelClassDropdown;

            $('#fromClassId').ejDropDownList({
                dataSource: this.mainClasses,
                width: "100%",
                watermarkText: "Select Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.fromClassId = args.value;
                    this.fromClassName = this.getClassName(this.fromClassId);

                    this.populateFromClassStudents();

                }
            });
            $('#toClassId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Promotion Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.toClassId = args.value;
                    this.toClassName = this.getClassName(this.toClassId);
                }
            });

        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
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

            // ENTIRE LEVEL MODE
            const levelClassIds = this.classes
                .filter(lc => lc.classId === this.fromClassId)
                .map(lc => lc.id);

            let students = this.students.filter(s =>
                levelClassIds.includes(s.classId)
            );

            if (!includeAlumni) {
                students = students.filter(s => !s.isAlumni);
            }

            if (students.length === 0) {
                this.toastHandler('warning', 'No students found.');
                this.tableData = [];
                return;
            }

            this.tableData = students.map(s => {
                const defaultToClass = this.getDefaultToClass(s.classId);

                return {
                    studentId: s.id,
                    studentIdentifier: s.studentIdentifier,
                    name: this.formatStudentName(s),
                    fromLevelClassId: s.classId,
                    fromLevelClassName: this.getClassName(s.classId),
                    toClassId: defaultToClass ? defaultToClass : this.emptyGuid,
                    selected: true,
                };
            });

            this.selectAll = true;
        },


        buildPromotionPayload() {
            const selected = this.selectedStudents;

            return {
                academicYearId: this.academicYearId,
                fromClassId: this.fromClassId,
                toClassId: this.emptyGuid,
                isIndividualClass: false,
                isEntireLevel: false,
                isAlumni: true,
                entireLevelClassId: this.fromClassId,
                students: selected.map(s => ({
                    studentId: s.studentId,
                    studentIdentifier: s.studentIdentifier,
                    toClassId: s.toClassId
                }))
            };
        },
        confirmSavePromotions() {
            const selected = this.selectedStudents;

            if (selected.length === 0) {
                this.toastHandler('warning', 'Please select at least one student.');
                return;
            }

            const missingToClass = selected.some(s => !s.toClassId);
            if (missingToClass) {
                this.toastHandler('warning', 'Please select a To Class for all selected students.');
                return;
            }

            $('#confirmSaveModal').modal({
                backdrop: 'static',
                keyboard: false
            }).modal('show');
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