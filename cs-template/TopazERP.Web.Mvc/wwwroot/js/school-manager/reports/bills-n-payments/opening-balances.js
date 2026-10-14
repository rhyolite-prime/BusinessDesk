const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            levels: [],
            academicYearId: '',
            termId: '',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            payments: [],
            isShimmerLoading: true,
            reportApiBaseUrl:'',
            levelClasses: [],
            classId: '',
            students:[],
            studentList:[],
            studentId: '',
            reportHeader: null,
            showDetails: true,
            title:'',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1785504805/erp-reports/school-manager/opening-balance-summary_q4shlz.rdl',
                detailsReportPath:'https://res.cloudinary.com/dusydqiob/raw/upload/v1785506390/erp-reports/school-manager/opening-balance-details_wydacx.rdl'
            },
        }
    },
    computed: {
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`
            }));
        },
    },
    methods: {
        loadData() {
            return axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((classes, mainClasses, streams) => {
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
            }));
        },

        // ─── Helpers ──────────────────────────────────────────────────────
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
        formatDate(dateStr) {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString('en-GB');
        },

        // ─── Dropdowns ────────────────────────────────────────────────────
        initDropdowns() {
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.levelClasses = levelClassDropdown;
        },
        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(response => {

                this.students = response.data.map(student => {
                    const name = [student.lastName, student.otherName, student.firstName]
                        .filter(x => x && x.trim())
                        .join(' ');

                    return {
                        ...student,
                        name,
                        displayText: `${student.studentIdentifier} - ${name}`
                    };
                });

                this.studentList = this.students;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get students.');

            });

        },
        getStudentName(studentId){
            const sn = this.studentList.find(c => c.id === studentId);
            return sn ? sn.name : '';
        },
        updateTitle() {
            const className = this.getClassName(this.classId);
            const studentName = this.getStudentName(this.studentId);
            if (this.classId && this.studentId === null) {
                this.title = `Opening Balances for '${className}'`;
            }
            else if (this.classId && this.studentId) {
                this.title = `Opening Balances for '${studentName}'`;
            }
            else{
                this.title = `Opening Balances`;
            }

        },
        searchReport() {
            this.isLoading = true;
            this.updateTitle();
            this.url = `/SmReports/GetOpeningBalancesSummary?title=${this.title}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;
            if (this.showDetails) {
                this.url = `/SmReports/GetOpeningBalances?title=${this.title}`;
                this.reportPath = this.reportPathConfig.detailsReportPath;
            }

            axios.get(this.url)
                .then(response => {
                    const header  = response.data.reportHeader;
                    this.header = header;
                    const details = response.data.reportDetails;

                    const filteredDetails = this.filterReport(details);

                    this.renderReport(header, filteredDetails, this.reportPath);
                    this.isLoading = false;
                    // show message from response
                    if (response.data.message) {
                        this.toastHandler('warning', response.data.message);
                    }
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },
        filterReport(details) {

            let filtered = details;

            if (this.classId) {
                filtered = filtered.filter(x =>
                    x.classId === this.classId
                );
            }

            if (this.studentId) {
                filtered = filtered.filter(x =>
                    x.studentId === this.studentId
                );
            }

            return filtered;
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
                dataSources: [
                    {
                        value: header,
                        name: "DataSet1"
                    },
                    {
                        value: details,
                        name: "DataSet2"
                    }
                ],
                reportError: (args) => {
                    console.error('Bold Report error:', args);
                    this.toastHandler('warning', 'No data available for the selected criteria.');
                }
            });
        },
       
        filterStudentsByClass() {
            const filtered = this.students.filter(s => s.classId === this.classId);
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            this.studentList = filtered;
            // Reset studentId when class changes
            this.studentId = null;
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
        classId: {
            handler() {
                this.updateTitle();
            },
            immediate: true
        },
        studentId: {
            handler() {
                this.updateTitle();
            },
            immediate: true
        }
    },
    
    async mounted() {
        await Promise.all([
            this.getStudents(),
            this.loadData()
        ]);
        this.initDropdowns();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');