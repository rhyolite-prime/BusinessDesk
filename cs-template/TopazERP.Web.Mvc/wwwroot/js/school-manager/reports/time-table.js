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
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            reportTitle: 'Class Time Table',
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770200139/erp-reports/school-manager/timetable_jca3v0_vzrbel.rdl',
        }
    },
    mounted() {
        this.loadData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods:  {
        loadData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmDataEntry/GetAllTimeTables/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmMainSetups/ListAllAcademicYears/'),
                axios.get('/SmMainSetups/ListAllSubjects/'),
                axios.get('/SmStaffSetups/ListAllStaffBios/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
            ]).then(axios.spread((classes, mainClasses, streams, timeTable, header, years, subjects, teachers, terms) => {

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.academicYears = years.data;
                this.timeTables = timeTable.data;
                this.header = header.data;
                this.subjects = subjects.data;
                this.teachers = teachers.data;
                this.terms = terms.data;
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
            
            const filteredTimeTables = this.timeTables.filter(t =>
                String(t.classId) === String(this.classId) &&
                String(t.academicYearId) === String(this.academicYearId) &&
                String(t.termId) === String(this.termId)
            );

            if (!filteredTimeTables.length) {
                this.toastHandler('warning', 'No timetable found for the selected class and academic year.');
                return;
            }

            const reportRows = [];
            const dayOrder = {
                "Monday": 1,
                "Tuesday": 2,
                "Wednesday": 3,
                "Thursday": 4,
                "Friday": 5,
                "Saturday": 6
            };

            this.days.forEach(day => {
                const dayTimeTable = filteredTimeTables.find(
                    t => t.day.toLowerCase() === day.toLowerCase()
                );

                if (!dayTimeTable || !dayTimeTable.details?.length) {
                    reportRows.push({
                        ClassName: className,
                        Day: day,
                        DayOrder: dayOrder[day],
                        SubjectName: '-',
                        TeacherName: '-',
                        StartTime: '-',
                        EndTime: '-',
                        Title: this.reportTitle,
                        AcademicYear: academicYearName
                    });
                    return;
                }

                dayTimeTable.details.forEach(d => {
                    reportRows.push({
                        ClassName: className,
                        Day: day,
                        DayOrder: dayOrder[day],
                        SubjectName: this.subjects.find(s => String(s.id) === String(d.subjectId))?.name || '',
                        TeacherName: this.getTeacherName(d.teacherId),
                        StartTime: d.startTime,
                        EndTime: d.endTime,
                        Title: this.reportTitle,
                        AcademicYear: academicYearName
                    });
                });
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