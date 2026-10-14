const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            timeTables: [],
            classId: null,
            classes: [],
            mainClasses: [],
            streams: [],
            reportApiBaseUrl: '',
            academicYearId: '',
            academicYears: [],
            reportHeader: [],
            teachers: [],
            subjects: [],
            terms: [],
            excursions: [],
            students: [],
            reportTitle: '',
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770211793/erp-reports/school-manager/excursions_qlfxpj.rdl',
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
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmMainSetups/ListAllAcademicYears/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmDataEntry/GetAllExcursions/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
            ]).then(axios.spread((classes, mainClasses, streams, header, years, terms, excursions, students) => {

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.academicYears = years.data;
                this.header = header.data;
                this.excursions = excursions.data;
                this.terms = terms.data;
                this.students = students.data;
                this.students.forEach(s => {
                    s.fullName = [s.lastName, s.firstName, s.otherName].filter(n => n).join(' ');
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.initDropdowns();
            }));
        },
        getTeacherName(teacherId) {
            const teacher = this.teachers.find(t => String(t.id) === String(teacherId));
            return teacher ? `${teacher.lastName}, ${teacher.firstName}` : '';
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        searchReport() {
            if (!this.classId || !this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select Class, Academic Year, and Term to generate the report.');
                return;
            }

            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            const YearName = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';
            const termName = this.terms.find(t => String(t.id) === String(this.termId))?.name || '';
            const academicYearName = `${YearName} (${termName})`;

            const filteredData = this.excursions.filter(e =>
                String(e.classId) === String(this.classId) &&
                String(e.academicYearId) === String(this.academicYearId) &&
                String(e.termId) === String(this.termId)
            );

            if (!filteredData.length) {
                this.toastHandler('warning', 'No timetable found for the selected class and academic year.');
                return;
            }
            this.reportTitle = `Excursions of class: '${className}' for '${termName}' '${YearName}'`;
            const reportRows = [];
            filteredData.forEach(e => {
                if (e.students && e.students.length) {
                    e.students.forEach(d => {
                        reportRows.push({
                            ClassName: className,
                            Title: this.reportTitle,
                            StudentName: this.students.find(s => String(s.id) === String(d.studentId))?.fullName || '',
                            StudentIdentifier: this.students.find(s => String(s.id) === String(d.studentId))?.studentIdentifier || '',
                            DepartureDate: this.normalizeDate(e.departureDate),
                            DepartureTime: this.formatTime(e.departureTime),
                            ReturnDate: this.normalizeDate(e.returnDate),
                            ReturnTime: this.formatTime(e.returnTime),
                            Destination: e.destination || '',
                            Point: e.point || '',
                            AcademicYear: `${YearName} (${termName})`
                        });
                    });
                }
            });

            this.renderReport(this.header, reportRows, this.reportPath);
        },


        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.academicYearId = args.value;
                },

                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }

            const levelClassDropdown = this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select Term...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.termId = args.value;
                }
            });
            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
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
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
        },
        formatTime(time) {
           // format time to 12 hour format
            const hours = time.split(':')[0];
            const minutes = time.split(':')[1];
            return `${hours}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
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