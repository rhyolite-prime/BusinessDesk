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
            classId: '',
            uploadFile: null,
            type: 'HomeWork',
            academicYears: [],
            classes: [],
            subjects: [],
            academicYearName: '',
            termName: '',
            className: '',
            subjectId: '',
            subjectName: '',
            assignmentNumber: 1,
            overallMark: 0,
            assignmentDate: '',
            assignmentNo: '',
            classSubjects: [],
            mainClasses: [],
            streams: [],
            mainSubjects: [],
            terms: [],
            isRawMark: true,
            IsPercentage: false,
            students: [],
            tableData: [],
            allAssignments: [],
            assignmentExists: false,
            lockInputs: false,
            existingAssignmentMessage: '',
            existingAssignmentList: [],
            selectedAssignment: null,
            rowErrors: {},
            validationErrors: [],
            hasLiveErrors: false,
            page: 1,
            perPage: 10,
            studentStatus:[]
        }
    },
    computed: {
        hasErrors() {
            return this.previewRows.some(r => r.error);
        },
        subjectsForSelectedClass() {
            if (!this.academicYearId || !this.termId || !this.classId) return [];

            const assigned = this.subjects.find(a =>
                a.academicYearId === this.academicYearId &&
                a.termId === this.termId &&
                a.classId === this.classId
            );

            return assigned ? assigned.details : [];
        },
        paginatedRows() {
            const start = (this.page - 1) * this.perPage;
            return this.tableData.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.tableData.length / this.perPage) || 1;
        }
    },
    mounted() {
        this.getStudentStatus();
        this.loadDropdowns();
        this.loadAllAssignments();
    },
    methods: {
        loadAllAssignments() {
            axios.get('/SmResultsPromotions/GetAllResults', {
                params: { type: this.type }
            }).then(res => {
                this.allAssignments = res.data || [];

                // 🔑 re-check once data is available
                this.findExistingAssignment();
            });
        },
        findExistingAssignment() {
            const foundAssignments = this.allAssignments.filter(a =>
                a.academicYearId === this.academicYearId &&
                a.termId === this.termId &&
                a.classId === this.classId &&
                a.subjectId === this.subjectId &&
                a.type === this.type &&
                a.isCanceled === false
            );

            if (foundAssignments.length) {
                this.assignmentExists = true;
                this.lockInputs = true;
                this.existingAssignmentMessage =
                    'Results(s) already entered for selected parameters';

                this.existingAssignmentList = foundAssignments;
                //sort by assignment number
                this.existingAssignmentList.sort((a, b) => a.assignmentNumber - b.assignmentNumber);

                this.toastHandler('warning', this.existingAssignmentMessage);
            } else {
                this.assignmentExists = false;
                this.lockInputs = false;
                this.existingAssignmentMessage = '';
                this.existingAssignmentList = [];
            }

            console.log(this.existingAssignmentList);
        },
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        selectAssignment(assignmentId) {
            this.assignmentExists = true;
            const assignment = this.existingAssignmentList.find(a => a.id === assignmentId);
            if (!assignment) return;

            this.selectedAssignment = assignment;

            const classStudents = this.students.filter(s => s.classId === assignment.classId);


            this.assignmentNumber = assignment.assignmentNumber;
            this.assignmentDate = this.normalizeDate(assignment.assignedDate);
            this.overallMark = assignment.overallMark;
            const studentMap = Object.fromEntries(
                classStudents.map(s => [s.studentIdentifier, s])
            );
            const detailsMap = {};
            assignment.details.forEach(d => {
                detailsMap[d.studentIdentifier] = d;
            });
            this.tableData = classStudents.map(s => {
                const detail = detailsMap[s.studentIdentifier];


                return {
                    studentIdentifier: s.studentIdentifier,
                    studentName: [s.lastName, s.firstName, s.otherName]
                        .filter(n => n && n.trim() !== '')
                        .join(' '),
                    marks: detail ? detail.marks : null
                };
            });
            this.tableData.sort((a, b) => a.studentName.localeCompare(b.studentName));
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
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllSubjects/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),

            ]).then(axios.spread((years, classes, terms, subjects, mainClasses, streams, mainSubjects, students) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;

                this.terms = terms.data;
                this.mainSubjects = mainSubjects.data;

                // ✅ FIXED
                this.subjects = subjects.data;
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
        getSubjectName(subjectId) {
            return this.mainSubjects.find(s => s.id === subjectId)?.name || '';
        },
        subjectsBySelection() {
            if (!this.academicYearId || !this.termId || !this.classId) {
                this.classSubjects = [];
                this.refreshSubjectDropdown([]);
                return;
            }

            const match = this.subjects.find(s =>
                s.academicYearId === this.academicYearId &&
                s.termId === this.termId &&
                s.classId === this.classId
            );

            const subjects = match
                ? match.details.map(d => ({
                    id: d.subjectId,
                    name: this.getSubjectName(d.subjectId)
                }))
                : [];

            this.classSubjects = subjects;
            this.refreshSubjectDropdown(subjects);
        },
        refreshSubjectDropdown(data) {
            const ddl = $('#subjectId').data('ejDropDownList');

            if (ddl) {
                ddl.option({
                    dataSource: data,
                    value: null
                });
            }
            this.loadResultsTable();
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        /* ===========================
           INIT EJ DROPDOWNS
        ============================ */
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
                    this.subjectsBySelection();
                    this.findExistingAssignment();
                    if (!this.assignmentExists) {
                        this.loadResultsTable();
                    }
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
            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Source Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
                    this.subjectsBySelection();
                    this.findExistingAssignment();
                    if (!this.assignmentExists) {
                        this.loadResultsTable();
                    }
                }
            });

            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.termId = args.value;
                    this.subjectsBySelection();
                    this.findExistingAssignment();
                    if (!this.assignmentExists) {
                        this.loadResultsTable();
                    }
                }

            });
            $('#subjectId').ejDropDownList({
                dataSource: [],
                width: "100%",
                watermarkText: "Select Subject",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.subjectId = args.value;
                    const selected = this.classSubjects.find(s => s.id === args.value);
                    this.subjectName = selected ? selected.name : '';
                    this.findExistingAssignment();

                    if (!this.assignmentExists) {
                        this.loadResultsTable();
                    }

                }
            });



        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        loadResultsTable() {
            if (!this.classId || !this.subjectId || !this.termId || !this.academicYearId) {
                this.tableData = [];
                return;
            }

            const classStudents = this.students.filter(
                s => s.classId === this.classId
            );

            this.tableData = classStudents.map(s => ({
                studentIdentifier: s.studentIdentifier,
                studentName: [s.lastName, s.firstName, s.otherName]
                    .filter(n => n && n.trim() !== '')
                    .join(' '),
                marks: null
            }));
        },
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
        },

        validateTable() {
            const errors = [];
            const rowErrors = {};
            // row validation
            for (const row of (this.tableData || [])) {
                const key = row.studentIdentifier;
                const marks = row.marks;
                if (this.overallMark > 0 && marks === null || marks === undefined || marks === '') {
                    const msg = 'Please add marks!';
                    errors.push(msg);
                    rowErrors[key] = msg;
                    continue;
                }
                else if (this.overallMark === 0 && marks !== null && marks !== undefined && marks !== '') {
                    const msg = 'Please add overall mark!';
                    errors.push(msg);
                    rowErrors[key] = msg;
                    continue;
                }
                else if (this.overallMark === 0 && marks === null && false && marks === '') {
                    rowErrors[key] = null;
                    continue;
                }
                const marksNum = Number(marks);
                if (isNaN(marksNum)) {
                    const msg = `invalid marks ("${marks}")`;
                    errors.push(msg);
                    rowErrors[key] = msg;
                    continue;
                }
                if (marksNum < 0) {
                    const msg = `marks cannot be negative (${marks})`;
                    errors.push(msg);
                    rowErrors[key] = msg;
                } else if ( marksNum > this.overallMark) {
                    const msg = `marks cannot be greater than (${this.overallMark})`;
                    errors.push(msg);
                    rowErrors[key] = msg;
                }
                else {
                    rowErrors[key] = null;
                }
            }

            this.validationErrors = errors;
            this.rowErrors = rowErrors;
            this.hasLiveErrors = errors.length > 0;
        },
        saveResults() {
            if (!this.tableData.length) {
                this.toastHandler('warning', 'No students to save.');
                return;
            }

            const payload = {
                academicYearId: this.academicYearId,
                academicYearName: this.academicYearName,
                termId: this.termId,
                termName: this.termName,
                classId: this.classId,
                className: this.className,
                subjectId: this.subjectId,
                subjectName: this.subjectName,
                assignmentNumber: this.assignmentNumber,
                type: this.type,
                overallMark: this.overallMark,
                assignedDate: this.assignmentDate,
                isRawMark: this.isRawMark,
                isPercentage: this.IsPercentage,
                isCanceled: false,
                details: this.tableData.map(r => ({
                    studentIdentifier: r.studentIdentifier,
                    studentName: r.studentName,
                    marks: r.marks
                }))
            };
            this.isLoading = true;

            if (this.overallMark === 0 || this.overallMark === null || this.overallMark < 0) {
                this.toastHandler('error', 'Please set overall mark');
            }
            if (this.validationErrors.length > 0) {
                this.toastHandler('error', 'Please fix errors before saving');
                this.isLoading = false;
                return;
            }

            axios.post('/SmResultsPromotions/CreateResult', payload)
                .then(res => {
                    if (res.data.code === 200) {
                        this.toastHandler('success', res.data.message || 'Results saved successfully');
                    } else {
                        this.toastHandler('error', res.data.message);
                    }
                })
                .catch(() => {
                    this.toastHandler('error', 'Server error occurred');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },
        addAnotherAssignment() {
            if (!this.academicYearId || !this.termId || !this.classId || !this.subjectId) {
                this.toastHandler('warning', 'Select Academic Year, Term, Class and Subject first');
                return;
            }

            const usedNumbers = this.allAssignments
                .filter(a =>
                    a.academicYearId === this.academicYearId &&
                    a.termId === this.termId &&
                    a.classId === this.classId &&
                    a.subjectId === this.subjectId &&
                    a.type === this.type &&
                    a.isCanceled === false
                )
                .map(a => a.assignmentNumber);

            const nextNumber = usedNumbers.length
                ? Math.max(...usedNumbers) + 1
                : 1;

            this.assignmentNumber = nextNumber;
            this.assignmentDate = new Date().toISOString().substr(0, 10);

            this.assignmentExists = false;
            this.lockInputs = false;
            this.existingAssignmentMessage = '';

            this.loadResultsTable();

            this.toastHandler('success', `Assignment ${nextNumber} ready`);
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
        // validate while typing marks
        tableData: {
            deep: true,
            handler() {
                this.validateTable();
            }
        },

        overallMark(val) {
            this.validateTable();

            if (val < 0) {
                this.toastHandler('error', 'Overall mark cannot be negative');
            }

        },
        classId() { this.validateTable(); },
        subjectId() { this.validateTable(); },
        termId() { this.validateTable(); },
        academicYearId() { this.validateTable(); },
    },
});
app.mount('#app');