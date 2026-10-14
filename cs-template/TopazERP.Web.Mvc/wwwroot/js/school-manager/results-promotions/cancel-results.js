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
            type: "",
            resultTypes: [
                {name: 'ClassAssignment'},
                {name: 'ClassTest'},
                {name: 'HomeWork'},
                {name: 'Project'},
                {name: 'Exam'},
                {name: 'MidTerm'}
            ],
            selectedAssignment: null,
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
            isCanceled: false,
            assignmentId: "",
            selectedAssignmentIds: [],
            showCancelModal: false
        }
    },
    computed: {
       
        subjectsForSelectedClass() {
            if (!this.academicYearId || !this.termId || !this.classId) return [];

            const assigned = this.subjects.find(a =>
                a.academicYearId === this.academicYearId &&
                a.termId === this.termId &&
                a.classId === this.classId
            );
            return assigned ? assigned.details : [];
        }
    },

    mounted() {
        this.loadDropdowns();
        this.loadAllAssignments();
    },
    methods: {
        toggleAssignmentSelection(assignment) {
            const index = this.selectedAssignmentIds.indexOf(assignment.id);

            if (index > -1) {
                // unselect
                this.selectedAssignmentIds.splice(index, 1);
            } else {
                // select
                this.selectedAssignmentIds.push(assignment.id);
                
            }
        },
        confirmCancel() {
            this.showCancelModal = true;
        },

        loadAllAssignments() {
            axios.get('/SmResultsPromotions/GetAllResults', {
                params: { type: this.type }
            }).then(res => {
                this.allAssignments = res.data || [];
                this.findExistingAssignment();

                this.allAssignments.forEach(assignment => {
                    this.tenantId = assignment.tenantId;
                    this.assignmentId = assignment.id;
                })
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
                this.existingAssignmentMessage =
                    'Assignment(s) already entered for selected parameters';

                this.existingAssignmentList = foundAssignments;
                this.existingAssignmentList.sort((a, b) => a.assignmentNumber - b.assignmentNumber);
            } else {
                this.assignmentExists = false;
                this.existingAssignmentMessage = '⚠ No assignment(s) found for selected parameters';
                this.existingAssignmentList = [];
            }

        },

        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        selectAssignment(assignmentId) {
            this.assignmentExists = true;

            const assignment = this.existingAssignmentList.find(a => a.id === assignmentId);
            if (!assignment) return;

            this.selectedAssignment = assignment;

            this.assignmentNumber = assignment.assignmentNumber;
            this.assignmentDate = this.normalizeDate(assignment.assignedDate);
            this.overallMark = assignment.overallMark;
            this.assignmentId = assignment.id;

            const classStudents = this.students.filter(
                s => s.classId === this.classId
            );

            const detailsMap = {};
            assignment.details.forEach(d => {
                detailsMap[d.studentIdentifier] = d;
            });

            this.tableData = classStudents.map(s => {
                const detail = detailsMap[s.studentIdentifier];

                return {
                    studentIdentifier: s.studentIdentifier,
                    studentName: [s.firstName, s.otherName, s.lastName]
                        .filter(n => n && n.trim() !== '')
                        .join(' '),
                    marks: detail ? detail.marks : null
                };
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
                this.students = students.data;


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
            // this.loadResultsTable();
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

                }
            });
            
            $('#type').ejDropDownList({
                dataSource: this.resultTypes,
                width: "100%",
                watermarkText: "Select Result Type",
                enableFilterSearch: true,
                fields: { id: "name", text: "name", value: "name" },
                change: args => {
                    this.type = args.value;
                    this.loadAllAssignments();
                }
            });



        },
        formatStudentName(student) {
            return [student.firstName, student.otherName, student.lastName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
      
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
        },
        cancelSelectedAssignments() {
            this.showCancelModal = false;
            this.isLoading = true;

            const requests = this.selectedAssignmentIds.map(id => {
                const a = this.allAssignments.find(x => x.id === id);
                if (!a) return Promise.resolve();

                return axios.post('/SmResultsPromotions/UpdateResult/', {
                    ...a,
                    isCanceled: true,
                    tenantId: this.tenantId,
                    id: id
                });
            });

            Promise.all(requests)
                .then(() => {
                    this.toastHandler('success', `${this.selectedAssignmentIds.length} result(s) canceled successfully`);
                    this.selectedAssignmentIds = [];
                    this.tableData = [];
                    this.loadAllAssignments();
                })
                .catch(() => this.toastHandler('error', 'Failed to cancel assignments'))
                .finally(() => this.isLoading = false);
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
                isCanceled: true,
                tenantId: this.tenantId,
                id: this.assignmentId,

                details: this.tableData.map(r => ({
                    studentIdentifier: r.studentIdentifier,
                    studentName: r.studentName,
                    marks: r.marks ?? 0
                }))
            };

            this.isLoading = true;


            axios.post('/SmResultsPromotions/UpdateResult/', payload)
                .then(res => {
                    this.toastHandler('success', res.data.message || 'Results canceled successfully.');
                    this.loadAllAssignments();
                })
                .catch(() => {
                    this.toastHandler('error', 'Server error occurred');
                })
                .finally(() => {
                    this.isLoading = false;
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