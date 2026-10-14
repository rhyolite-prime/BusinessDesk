const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            awards: [],
            prizes: [],
            academicYears: [],
            terms: [],
            levels: [],
            students: [],
            prizeAwards: [],
            studentsInLevel: [],
            classes: [],
            reportTitle: '',
            levelId: null,
            academicYearId: null,
            termId: null,
            header: [],
            reportApiBaseUrl: '',
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770214020/erp-reports/school-manager/prizeAwards_ramd8n.rdl',
        }
        },
    methods: {
        loadDropdowns() {
            axios.all([
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/SmDataEntry/GetAllAwardTypes/'),
                axios.get('/SmDataEntry/GetAllPrizeTypes/'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmDataEntry/GetAllPrizeAwards/'),
                axios.get('/SmReports/GetReportHeader/')
            ]).then(axios.spread((
                students, terms, years, levels, awards, prizes,classes, prizeAwards, header
            ) => {
                this.header = header.data;
                this.students = students.data;
                this.students.forEach(s => {
                    s.fullName = [s.lastName, s.firstName, s.otherName].filter(n => n).join(' ');
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.academicYears = years.data;
                this.terms = terms.data;
                this.levels = levels.data;
                this.awards = awards.data;
                this.prizes = prizes.data;
                this.classes=classes.data;
                this.prizeAwards=prizeAwards.data;
                this.initDropdowns();

            }));
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
                    this.searchReport();
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.termId = args.value;
                    this.searchReport();
                }
            });
            $('#levelId').ejDropDownList({
                dataSource: this.levels,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "levelName", value: "id" },
                change: args => {
                    this.levelId = args.value;
                    this.searchReport();
                
                }
            });

        },
        searchReport() {
            if (!this.levelId || !this.academicYearId || !this.termId) {
                this.toastHandler('warning', 'Please select level, Academic Year, and Term to generate the report.');
                return;
            }
            const YearName = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';
            const termName = this.terms.find(t => String(t.id) === String(this.termId))?.name || '';
            const academicYearName = `${YearName} (${termName})`;
            const levelName = this.levels.find(l => String(l.id) === String(this.levelId))?.levelName || '';
            const filteredData = this.prizeAwards.filter(e =>
                String(e.levelId) === String(this.levelId) &&
                String(e.academicYearId) === String(this.academicYearId) &&
                String(e.termId) === String(this.termId)
            );

            if (!filteredData.length) {
                this.toastHandler('warning', 'No data found for the selected class and academic year.');
                return;
            }
            this.reportTitle = `Prize Awarded for level: '${levelName}' for '${termName}' '${YearName}'`;
            const reportRows = [];
            filteredData.forEach(e => {
                if (e.details && e.details.length) {
                    e.details.forEach(d => {
                        reportRows.push({
                            StudentIdentifier: this.students.find(s => String(s.id) === String(d.studentId))?.studentIdentifier || '',
                            LevelName: levelName,
                            PrizeName: this.prizes.find(p => String(p.id) === String(d.prizeId))?.name || '',
                            AwardName: this.awards.find(a => String(a.id) === String(d.awardId))?.name || '',
                            Title: this.reportTitle,
                            StudentName: this.students.find(s => String(s.id) === String(d.studentId))?.fullName || '',
                        })
                    })
                }
            })

            this.renderReport(this.header, reportRows, this.reportPath);
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
        
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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
    mounted() {
        this.reportApiBaseUrl = reportApiBaseUrl;
        this.loadDropdowns();
    }
});
app.mount('#app');