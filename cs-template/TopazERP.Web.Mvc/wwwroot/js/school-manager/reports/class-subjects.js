const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            classId: null,
            classes: [],
            mainClasses: [],
            streams: [],
            reportApiBaseUrl: '',
            academicYearId: '',
            academicYears: [],
            reportHeader: [],
            subjects: [],
            terms: [],
            assignedSubjects: [],
            reportTitle: '',
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770201834/erp-reports/school-manager/subjects-by-class_mupmzr.rdl',
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
                axios.get('/SmMainSetups/ListAllSubjects/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/')
            ]).then(axios.spread((classes, mainClasses, streams,  header, years, subjects, terms, assignedSubjects) => {

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.academicYears = years.data;
                this.header = header.data;
                this.subjects = subjects.data;
                this.terms = terms.data;
                this.assignedSubjects = assignedSubjects.data;
                
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
            if (!this.classId || !this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select Class, Academic Year, and Term to generate the report.');
                return;
            }

            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            const YearName = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';
            const termName = this.terms.find(t => String(t.id) === String(this.termId))?.name || '';
            
            this.reportTitle = `Subjects of class: '${className}' for '${termName}' '${YearName}'`;

            const filteredAssignedSubjects = this.assignedSubjects.filter(t =>
                String(t.classId) === String(this.classId) &&
                String(t.academicYearId) === String(this.academicYearId) &&
                String(t.termId) === String(this.termId)
            );

            if (!filteredAssignedSubjects.length) {
                this.toastHandler('warning', 'No assigned subjects found for the selected class, term, and academic year.');
                return;
            }

            const reportRows = [];

            filteredAssignedSubjects.forEach(asg => {
                if (asg.details && asg.details.length) {
                    asg.details.forEach(d => {
                        reportRows.push({
                            ClassName: className,
                            SubjectName: d.subjectName || this.subjects.find(s => String(s.id) === String(d.subjectId))?.name || '',
                            Title: this.reportTitle, 
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