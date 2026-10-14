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
            type: 'Project',
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
            assignmentHeaders: [],
            assignmentOverallMarks: {},
            currentDate: new Date().toLocaleDateString(),
            currentPage: 1,
            totalPages: 0,
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770641945/erp-reports/school-manager/classassignment_d4dz30_szv1g1.rdl',
        }
        },
    mounted() {
        this.loadDropdowns();
        this.loadAllAssignments();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
        loadAllAssignments() {
            axios.get('/SmResultsPromotions/GetAllResults', {
                params: { type: this.type }
            }).then(res => {
                this.allAssignments = res.data || [];

                // put overal marks in 2 decmal places and round it off
                this.allAssignments.forEach(a => {
                    a.overallMark = parseFloat(a.overallMark).toFixed(2);
                    // put details marks in 2 decmal places and round it off
                    a.details.forEach(d => {
                        d.marks = parseFloat(d.marks).toFixed(2);
                    });
                });
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

            ]).then(axios.spread((years, classes, terms, subjects, mainClasses, streams, mainSubjects, students, header) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.header = header.data;

                this.terms = terms.data;
                this.mainSubjects = mainSubjects.data;

                this.subjects = subjects.data;
                this.students = students.data;
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
                this.toastHandler('warning', 'Please select Class, Academic Year, Term and Subject to generate the report.');
                return;
            }

            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            const YearName = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';
            const termName = this.terms.find(t => String(t.id) === String(this.termId))?.name || '';
            this.className = className;
            this.academicYearName = YearName;
            this.termName = termName;
            const totalStudents = this.students.filter(s => s.classId === this.classId).length;
            this.subjectName = this.getSubjectName(this.subjectId);



            // filter assignments for selected class, term, subject
            const filteredData = this.allAssignments.filter(e =>
                String(e.classId) === String(this.classId) &&
                String(e.academicYearId) === String(this.academicYearId) &&
                String(e.termId) === String(this.termId) &&
                String(e.subjectId) === String(this.subjectId)
            );

            if (!filteredData.length) {
                this.toastHandler('warning', 'No results found for the selected class, term and subject.');
                return;
            }

            this.reportTitle = 'Project Results for ' + ' - ' + ' (' + termName + ' ' + YearName + ')';

            const assignmentNumbers = [...new Set(filteredData.map(a => a.assignmentNumber))].sort((a, b) => a - b);

            const studentMap = {};

            const reportRows = [];

            filteredData.forEach(a => {
                a.details.forEach(d => {
                    const student = this.students.find(s => s.studentIdentifier === d.studentIdentifier);
                    const studentName = student
                        ? [student.lastName, student.firstName, student.otherName]
                            .filter(n => n && n.trim() !== '')
                            .join(' ')
                        : 'Unknown Student';
                    reportRows.push({
                        StudentIdentifier: d.studentIdentifier,
                        StudentName: studentName,
                        ClassName: className,
                        SubjectName: this.subjectName,
                        AcademicYear: YearName,
                        TermName: termName,
                        AssignmentNumber: a.assignmentNumber,
                        Marks: d.marks,
                        OverallMark: a.overallMark,
                        Title: this.reportTitle,
                        TotalStudents: totalStudents,
                    });
                });
            });
            reportRows.sort((a, b) => a.StudentIdentifier.localeCompare(b.StudentIdentifier));
            this.renderReport1(this.header, reportRows,this.reportPath);
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