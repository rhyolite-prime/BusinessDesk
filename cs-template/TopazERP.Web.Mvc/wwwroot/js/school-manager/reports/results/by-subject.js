const app = Vue.createApp({
    data() {
        return {
            assignments: [],
            flatAssignments: [],
            isLoading: false,
            schClasses: [],
            academicYearId: '',
            termId: '',
            classId: '',
            uploadFile: null,
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
            students: [],
            tableData: [],
            allAssignments: [],
            reportTitle: '',
            header: [],
            assessmentTypes: [
                'ClassAssignment',
                'ClassTest',
                'HomeWork',
                'Project',
                'MidTerm',
                'Exam'
            ],
            assignmentHeaders: [],
            assignmentOverallMarks: {},
            currentDate: new Date().toLocaleDateString(),
            currentPage: 1,
            totalPages: 0,
            teachers: [],
            teacherSubjects: [],
            classLevelPercentages: [],
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770641945/erp-reports/school-manager/results-by-subject_puudnf_twnqjl.rdl',
        }
        },
    mounted() {
        this.loadDropdowns();
        this.loadAllAssignments();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
        loadAllAssignments() {
            axios.get('/SmReports/GetAllResults', {}).then(res => {
                this.allAssignments = res.data || [];

            });
        },
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
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
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmStaffSetups/ListAllTeacherSubjects/'),
                axios.get('/SmStaffSetups/ListAllStaffBios/'),
                axios.get('/SmDataEntry/GetAllClassLevelPercentages/')

            ]).then(axios.spread((years, classes, terms, subjects, mainClasses, streams, mainSubjects, students, header, teacherSubjects, teachers, percentages) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.header = header.data;

                this.terms = terms.data;
                this.mainSubjects = mainSubjects.data;
                this.teachers = teachers.data;
                this.teachers.forEach(t => {
                    t.fullName = `${t.firstName} ${t.lastName}`
                })

                this.subjects = subjects.data;
                this.students = students.data;
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.subjectTeachers = teacherSubjects.data;
                this.classLevelPercentages = percentages.data;

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
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
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
                    this.subjectsBySelection();
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
                    this.searchReport();
                }
            });
        },
        searchReport() {
            if (!this.classId || !this.academicYearId || !this.termId || !this.subjectId) {
                this.toastHandler(
                    'warning',
                    'Please select Class, Academic Year, Term and Subject to generate the report.'
                );
                return;
            }
            // Basic metadata
            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            const levelId = classInfo.levelId; // Level of this class

            const academicYearName = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';
            const termName = this.terms.find(t => String(t.id) === String(this.termId))?.name || '';

            this.className = className;
            this.academicYearName = academicYearName;
            this.termName = termName;
            this.subjectName = this.getSubjectName(this.subjectId);

            const subjectTeacher = this.subjectTeachers.find(s => s.subjectId === this.subjectId)?.staffId;
            const teacherName = this.teachers.find(t => String(t.id) === String(subjectTeacher))?.fullName || '';

            this.reportTitle = `Results by Subject - ${this.subjectName} (${termName} ${academicYearName})`;

            // Filter assignments for this subject
            const allowedTypes = ['ClassAssignment', 'HomeWork', 'ClassTest', 'Project', 'Exam'];
            const filteredData = this.allAssignments.filter(a =>
                String(a.classId) === String(this.classId) &&
                String(a.academicYearId) === String(this.academicYearId) &&
                String(a.termId) === String(this.termId) &&
                String(a.subjectId) === String(this.subjectId) &&
                allowedTypes.includes(a.type)
            );

            if (!filteredData.length) {
                this.toastHandler('warning', 'No results found for the selected criteria.');
                return;
            }

            // Get the percentages for this class level
            const yearPercentages = this.classLevelPercentages.find(y => y.academicYearId === this.academicYearId);
            let classPercentage = 0.5;
            let examPercentage = 0.5;

            if (yearPercentages && yearPercentages.details) {
                const levelMatch = yearPercentages.details.find(d => d.levelId === levelId);
                if (levelMatch) {
                    classPercentage = levelMatch.classPercentage;
                    examPercentage = levelMatch.examPercentage;
                }
            }

            // Build student map
            const studentMap = {};
            filteredData.forEach(assessment => {
                assessment.details.forEach(d => {
                    const student = this.students.find(s => s.studentIdentifier === d.studentIdentifier);
                    const studentName = student
                        ? [student.lastName, student.firstName, student.otherName]
                            .filter(n => n && n.trim() !== '')
                            .join(' ')
                        : 'Unknown Student';
                    if (!studentMap[d.studentIdentifier]) {
                        studentMap[d.studentIdentifier] = {
                            StudentIdentifier: d.studentIdentifier,
                            StudentName: studentName,
                            ClassAssignment: 0,
                            HomeWork: 0,
                            ClassTest: 0,
                            Project: 0,
                            Exam: 0,
                            classScoreObtained: 0,
                            classScoreOverall: 0,
                            examScoreObtained: 0,
                            examScoreOverall: 0,
                        };
                    }
                    if (assessment.type === 'Exam') {
                        studentMap[d.studentIdentifier].examScoreObtained += d.marks || 0;
                        studentMap[d.studentIdentifier].examScoreOverall += assessment.overallMark || 0;
                        studentMap[d.studentIdentifier].Exam += Number(d.marks) || 0;
                    } else {
                        studentMap[d.studentIdentifier].classScoreObtained += d.marks || 0;
                        studentMap[d.studentIdentifier].classScoreOverall += assessment.overallMark || 0;
                        studentMap[d.studentIdentifier][assessment.type] += Number(d.marks) || 0;
                    }
                });
            });
            
            const reportRows = [];
            Object.values(studentMap).forEach(student => {
                let classPercent100 = 0;
                if (student.classScoreOverall > 0) {
                    classPercent100 =
                        (student.classScoreObtained / student.classScoreOverall) * 100;
                }

                const percentageClassScore =
                    (classPercent100 / 100) * (classPercentage);

                /* ---- EXAM CALCULATION ---- */
                let examPercent100 = 0;
                if (student.examScoreOverall > 0) {
                    examPercent100 =
                        (student.examScoreObtained / student.examScoreOverall) * 100;
                }

                const percentageExam =
                    (examPercent100 / 100) * (examPercentage);

                
               /* const totalPerStudent =
                    (student.ClassAssignment * classPercentage) +
                    (student.HomeWork * classPercentage) +
                    (student.ClassTest * classPercentage) +
                    (student.Project * classPercentage) +
                    (student.Exam * examPercentage);*/

                reportRows.push({
                    StudentIdentifier: student.StudentIdentifier,
                    StudentName: student.StudentName,
                    ClassAssignment: student.ClassAssignment,
                    HomeWork: student.HomeWork,
                    ClassTest: student.ClassTest,
                    Project: student.Project,
                    Exam: student.Exam,
                    TotalPerStudent: percentageClassScore + percentageExam,
                    ClassName: className,
                    SubjectName: this.subjectName,
                    Title: this.reportTitle,
                    TotalStudents: Object.keys(studentMap).length,
                    Term: termName,
                    Year: academicYearName,
                    TeacherName: teacherName
                });
            });

            reportRows.sort((a, b) => a.StudentName.localeCompare(b.StudentName));
            this.renderReport1(this.header, reportRows, this.reportPath);
        },


        renderReport1(header, details, reportPath) {
            $("#reportView").empty();
            $("#reportView").boldReportViewer({
                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                toolbarSettings: {
                    showToolbar: true,
                    items: ej.ReportViewer.ToolbarItems.All &
                        ~ej.ReportViewer.ToolbarItems.Print
                },
                reportPath: reportPath,
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                    {
                        value: details,
                        name: "DataSet2"
                    }]

            });
        },

        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },

        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
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