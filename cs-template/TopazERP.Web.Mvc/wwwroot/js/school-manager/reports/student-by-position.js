const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            allStudents: [],
            students: [],
            classId: null,
            classes: [],
            mainClasses: [],
            streams: [],
            reportApiBaseUrl: '',
            reportHeader: [],
            genderFilter: [],
            statuses: [],
            academicYears: [],
            studentsByPosition: [],
            academicYearId: null,
            positionId: null,
            reportTitle: 'Students By Position',
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643461/erp-reports/school-manager/studentsList_nqrqj9_skegqj.rdl',
        }
        },
    mounted() {
        this.loadData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
        loadData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmStudentSetups/ListAllPosition/'),
                axios.get('/SmMainSetups/ListAllAcademicYears/'),
                axios.get('/SmReports/GetStudentPositions/'),
            ]).then(axios.spread((classes, mainClasses, streams, students, header,  positions, years, studentPositions) => {

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.positions = positions.data;
                this.academicYears = years.data;
                this.studentsByPosition = studentPositions.data;
                
                // ✅ assign allStudents first
                this.allStudents = students.data.filter(s => !s.isPreClassStudent);
                this.allStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.students = [...this.allStudents];

                this.header = header.data;


                this.initDropdowns();
            }));
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        searchReport() {

            if (!this.positionId || !this.academicYearId) {
                this.toastHandler('warning', 'Please select Academic Year and Position');
                return;
            }
          
            const position =
                this.positions.find(p => String(p.id) === String(this.positionId));

            const year =
                this.academicYears.find(y => String(y.id) === String(this.academicYearId));

            const positionName = position?.name || '';
            const yearName = year?.name || '';

            // 1️⃣ Filter student-position records
            const filteredPositions = this.studentsByPosition.filter(sp =>
                String(sp.positionId) === String(this.positionId) &&
                String(sp.academicYearId) === String(this.academicYearId)
            );

            if (!filteredPositions.length) {
                this.toastHandler('warning', 'No students found for the selected position.');
                return;
            }

            const reportStudents = filteredPositions.map((sp, index) => {
                const student = this.allStudents.find(
                    s => String(s.id) === String(sp.studentId)
                );
                const classInfo = this.classes.find(c => String(c.id) === String(student.classId)) || {};

                const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
                if (!student) return null;

                return {
                    SN: index + 1,
                    StudentName: this.formatStudentName(student),
                    StudentIdentifier: student.studentIdentifier || '',
                    Gender: student.gender || '',
                    Position: positionName,
                    AcademicYear: yearName,
                    StartDate: this.normalizeDate(sp.startDate),
                    EndDate: this.normalizeDate(sp.endDate),
                    Title: `Students Holding Position '${positionName}' (${yearName})`,
                    DateOfBirth: this.normalizeDate(student.dateOfBirth),
                    PhoneNumber: student.phoneNumber,
                    ClassName: className
                };
            }).filter(Boolean);

            this.renderReport(this.header, reportStudents, this.reportPath);
        },


        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);

            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select Academic Year...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.academicYearId = args.value;
                    this.searchReport();
                },
                value: activeYear ? activeYear.id : null
            });

            if (activeYear) {
                this.academicYearId = activeYear.id;
                this.searchReport();
            }
            $('#positionId').ejDropDownList({
                dataSource: this.positions,
                width: "100%",
                watermarkText: "Select Position...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.positionId = args.value;
                    this.searchReport();
                }
            });
        },
        renderReport(header, details, reportPath) {
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