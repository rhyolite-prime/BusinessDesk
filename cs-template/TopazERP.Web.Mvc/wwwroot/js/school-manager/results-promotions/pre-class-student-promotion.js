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
            promoteWholeClass: true,
            promoteStudent: false,
            studentId: null,
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
        filteredTableData() {
            if (!this.searchQuery) return this.tableData;

            const query = this.searchQuery.toLowerCase();

            return this.tableData.filter(s =>
                s.lastName.toLowerCase().includes(query) ||
                s.studentIdentifier.toLowerCase().includes(query)
            );
        },
        paginatedRows() {
            const start = (this.page - 1) * this.perPage;
            return this.filteredTableData.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.filteredTableData.length / this.perPage) || 1;
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
        toggleStudentPromotion() {
            this.promoteStudent = true;
            this.promoteWholeClass = false;
        },
        togglePromotionClass() {
            this.promoteStudent = false;
            this.promoteWholeClass = true;
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
                this.studentStatus = statuses.data;
              
                const studentsList = students.data.filter(s => s.isAlumni === false && s.isPreClassStudent === true);
                const activeStatusIds = this.studentStatus
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
                .filter(c => !c.isHighestClass)
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
                    
                }
            });
            $('#studentId').ejDropDownList({
                dataSource: this.students,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                    this.populateFromClassStudents();
                }
            });


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

            this.populateFromClassStudents();
        },

        handlePromotionNo() {
            $('#promotionWarningModal').modal('hide');
        },
        populateFromClassStudents() {
            let students;
           

            if (this.promoteStudent && this.studentId) {
                // Individual student selected
                const student = this.students.find(s => s.id === this.studentId);

                if (!student) {
                    this.toastHandler('warning', 'Selected student not found.');
                    this.tableData = [];
                    return;
                }

                // Set fromClassId to the student's class
                this.fromClassId = student.classId;
                this.fromClassName = this.getClassName(this.fromClassId);

                // Include only this student in the table
                students = [student];
            } else if (this.promoteWholeClass && this.fromClassId) {
                const levelClassIds = this.classes
                    .filter(lc => lc.classId === this.fromClassId)
                    .map(lc => lc.id);
               // students = this.students.filter(s => s.classId === this.fromClassId);
                students = this.students.filter(s =>
                    levelClassIds.includes(s.classId)
                );

                if (students.length === 0) {
                    this.toastHandler('warning', 'No students found in the selected class.');
                    this.tableData = [];
                    return;
                }
            } else {
                // Nothing selected
                this.tableData = [];
                return;
            }

            // Map students to tableData
            this.tableData = students.map(s => ({
                studentId: s.id,
                studentIdentifier: s.studentIdentifier,
                lastName: s.lastName,
                firstName: s.firstName,
                otherName: s.otherName,
                name: this.formatStudentName(s),
                fromClassId: s.classId,
                fromClassName: this.getClassName(s.classId),
                selected: true,
                toClassId: ''
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

            axios.post('/SmResultsPromotions/CreatePreClassPromotion/', payload)
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